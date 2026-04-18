const express = require("express");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const mammoth = require("mammoth");

const pdfParse = require("pdf-parse");


const router = express.Router();

// Helper function to extract text from files
async function extractFileContent(file, maxChars = 50000) {
  const { originalname, mimetype, buffer } = file;

  try {
    let content = '';

    // Text files
    if (mimetype === 'text/plain' || mimetype === 'text/csv' || mimetype === 'text/html') {
      content = buffer.toString('utf-8');
    }
    // JSON files
    else if (mimetype === 'application/json') {
      content = buffer.toString('utf-8');
    }
    // Word documents (.docx)
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    }
    // Markdown files
    else if (mimetype === 'text/markdown' || originalname.endsWith('.md')) {
      content = buffer.toString('utf-8');
    }
    // PDF (basic info only - full PDF parsing requires additional libraries)
    else if (mimetype === "application/pdf") {
      const data = await pdfParse(buffer);
      content = data.text;
    }

    // Fallback for unknown types (should not reach here due to validation)
    else {
      return '[File type not supported: ' + originalname + ']';
    }

    // Truncate content if too large
    if (content.length > maxChars) {
      const truncated = content.substring(0, maxChars);
      return truncated + `\n\n[... Content truncated. Original length: ${content.length} characters, showing first ${maxChars} characters ...]`;
    }

    return content;

  } catch (error) {
    console.error('Error extracting content from file:', originalname, error);
    return '[Error extracting content from file: ' + originalname + ']';
  }
}

router.post(
  "/",
  auth,
  upload.array("files", 10), // Allow up to 10 files
  async (req, res) => {
    try {
      const { systemPrompt, userPrompt } = req.body;
      const files = req.files || [];

      if (!userPrompt || !userPrompt.trim()) {
        return res.status(400).json({ error: "User prompt is required" });
      }

      // Validate file types (only text, PDF, and documents)
      const allowedTypes = [
        'text/plain',
        'text/csv',
        'text/html',
        'text/markdown',
        'application/json',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      const allowedExtensions = ['.txt', '.csv', '.html', '.md', '.json', '.pdf', '.doc', '.docx'];

      for (const file of files) {
        const isValidType = allowedTypes.includes(file.mimetype);
        const hasValidExtension = allowedExtensions.some(ext =>
          file.originalname.toLowerCase().endsWith(ext)
        );

        if (!isValidType && !hasValidExtension) {
          return res.status(400).json({
            error: `File type not allowed: ${file.originalname}. Only text, PDF, and document files are accepted.`
          });
        }
      }

      // Build messages array
      const messages = [];

      // Add system message if provided
      if (systemPrompt && systemPrompt.trim()) {
        messages.push({
          role: "system",
          content: systemPrompt.trim()
        });
      }

      // Build user content with file contents if files are uploaded
      let userContent = userPrompt.trim();

      // Initialize truncation info (needed for logging)
      const fileTruncationInfo = {};

      if (files.length > 0) {
        // Calculate max chars per file to stay within model limits
        // Roughly 1 token = 4 chars, model context ~32k tokens, reserve 10k for response
        // So max input ~22k tokens = ~88k chars total
        const maxTotalChars = 80000;
        const systemPromptChars = systemPrompt ? systemPrompt.length : 0;
        const userPromptChars = userPrompt.length;
        const availableChars = maxTotalChars - systemPromptChars - userPromptChars - 5000; // 5k buffer
        const maxCharsPerFile = Math.floor(availableChars / files.length);

        // Extract file contents
        const fileContents = {};

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const originalSize = file.buffer.length;
          const content = await extractFileContent(file, maxCharsPerFile);

          // Track if file was truncated
          const wasTruncated = content.includes('[... Content truncated.');
          fileTruncationInfo[i] = {
            name: file.originalname,
            wasTruncated,
            originalSize: (originalSize / 1024).toFixed(2)
          };

          // Create placeholder variables (file_1, file_2, etc.)
          fileContents[`file_${i + 1}`] = content;
          fileContents[`file${i + 1}`] = content;
        }

        // Check if prompt contains any placeholders
        const hasPlaceholders = /\{[^}]+\}/.test(userContent);

        if (hasPlaceholders) {
          // Replace placeholders with file contents
          userContent = userContent.replace(/\{([^}]+)\}/g, (match, placeholder) => {
            const key = placeholder.trim();
            if (fileContents[key]) {
              return fileContents[key];
            }
            // Keep placeholder if no matching file
            return match;
          });

          // Add truncation notice at the end if any files were truncated
          const truncatedFiles = Object.values(fileTruncationInfo).filter(f => f.wasTruncated);
          if (truncatedFiles.length > 0) {
            userContent += '\n\n[Note: ';
            if (truncatedFiles.length === 1) {
              userContent += `The file "${truncatedFiles[0].name}" (${truncatedFiles[0].originalSize} KB) was automatically truncated to fit within context limits.]`;
            } else {
              userContent += `${truncatedFiles.length} files were automatically truncated to fit within context limits: `;
              userContent += truncatedFiles.map(f => `"${f.name}" (${f.originalSize} KB)`).join(', ');
              userContent += ']';
            }
          }
        } else {
          // No placeholders found - append files in traditional format
          userContent += '\n\n--- Attached Files ---\n';

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const content = fileContents[`file_${i + 1}`];
            const truncated = fileTruncationInfo[i].wasTruncated;

            userContent += `\nFile ${i + 1}: ${file.originalname}\n`;
            userContent += `Type: ${file.mimetype}\n`;
            userContent += `Size: ${(file.size / 1024).toFixed(2)} KB\n`;
            if (truncated) {
              userContent += `Status: Content truncated to fit context limits\n`;
            }
            userContent += `Content:\n${content}\n`;
            userContent += '\n---\n';
          }
        }
      }

      // Add user message
      messages.push({
        role: "user",
        content: userContent
      });

      // Log the complete prompt to console
      console.log('\n=== GENERATE REQUEST ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('User ID:', req.user?.userId || 'N/A');
      console.log('Files uploaded:', files.length);
      if (files.length > 0) {
        console.log('File details:', files.map((f, i) => ({
          index: i + 1,
          name: f.originalname,
          size: `${(f.size / 1024).toFixed(2)} KB`,
          truncated: fileTruncationInfo[i]?.wasTruncated || false
        })));
      }
      console.log('\n--- Complete Prompt ---');
      if (systemPrompt && systemPrompt.trim()) {
        console.log('[SYSTEM PROMPT]');
        console.log(systemPrompt.trim());
        console.log('');
      }
      console.log('[USER PROMPT]');
      console.log(userContent);
      console.log('\n--- End of Prompt ---');
      console.log('Total prompt length:', userContent.length, 'characters');
      console.log('========================\n');

      // Call BharatGen API with streaming
      // const response = await fetch("http://10.67.19.153:8005/v1/chat/completions", {
      //   method: "POST",
      //   headers: {
      //     "Authorization": "Bearer sk-iFlFVzowop-0zImeskCh1w",
      //     "Content-Type": "application/json"
      //   },
      //   body: JSON.stringify({
      //     model: "gpt-oss-20b",
      //     enable_thinking: false,
      //     max_tokens: 4000,
      //     stream: true,
      //     messages
      //   })
      // });

      // if (!response.ok) {
      //   const errorText = await response.text();
      //   console.error("BharatGen API error:", response.status, errorText);
      //   return res.status(response.status).json({
      //     error: `API request failed: ${response.statusText}`
      //   });
      // }
      
      const response = await fetch("https://unexecutorial-unstratified-ayanna.ngrok-free.dev/v1/chat/completions", {
        method: "POST",
        headers: {
           'Content-Type': 'application/json',
          //  'Authorization': 'Bearer bharatgen-secret-token-123'
        },
        body: JSON.stringify({
          // model: "param-17B SFT S1",
          enable_thinking: false,
          max_tokens: 2000,
          stream: true,
          messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("BharatGen API error:", response.status, errorText);
        return res.status(response.status).json({
          error: `API request failed: ${response.statusText}`
        });
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            res.write('data: [DONE]\n\n');
            res.end();
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;

                if (content) {
                  // Send the content chunk to client
                  res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
              } catch (e) {
                // Skip invalid JSON
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
        res.end();
      }

    } catch (err) {
      console.error("Generation error:", err);
      res.status(500).json({ error: "Generation failed" });
    }
  }
);

module.exports = router;



// import { useState, useEffect } from "react";
// import Navbar from "../components/Navbar";
// import "../styles/layout.css";
// import { useSearchParams } from "react-router-dom";
// import { useAppContext } from "../context/AppContext";
// import { useLocation } from "react-router-dom";
// import { API_BASE_URL } from "../config";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";

// export default function Generate() {
//   const [systemPrompt, setSystemPrompt] = useState("");
//   const [userPrompt, setUserPrompt] = useState("");
//   const [files, setFiles] = useState([]);
//   const [output, setOutput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [searchParams] = useSearchParams();
//   const category = searchParams.get("category");
//   const { setGenerateText, setTranslatedText } = useAppContext();
//   const location = useLocation();

//   //   useEffect(() => {
//   //   if (category) {
//   //     setPrompt(`Generate content related to ${category.replace("-", " ")}`);
//   //   }
//   // }, [category]);
//   useEffect(() => {
//     if (location.state?.prefilledPrompt) {
//       setUserPrompt(location.state.prefilledPrompt);
//       setTranslatedText(""); // reset old translation (important)
//     }
//   }, [location.state, setTranslatedText]);


//   const handleGenerate = async () => {
//     if (!userPrompt.trim()) {
//       alert("Please enter a user prompt");
//       return;
//     }

//     setLoading(true);
//     setOutput("");

//     try {
//       const formData = new FormData();
//       formData.append("userPrompt", userPrompt);
//       if (systemPrompt.trim()) {
//         formData.append("systemPrompt", systemPrompt);
//       }
//       files.forEach((file) => {
//         formData.append("files", file);
//       });

//       const res = await fetch(`/api/generate`, {
//         method: "POST",
//         credentials: "include",
//         body: formData,
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         alert(data?.error || `Request failed (${res.status})`);
//         setLoading(false);
//         return;
//       }

//       // Handle SSE streaming
//       // const reader = res.body.getReader();
//       // const decoder = new TextDecoder();
//       // let accumulatedOutput = "";

//       // while (true) {
//       //   const { done, value } = await reader.read();

//       //   if (done) {
//       //     break;
//       //   }

//       //   // Decode the chunk
//       //   const chunk = decoder.decode(value, { stream: true });
//       //   const lines = chunk.split('\n').filter(line => line.trim() !== '');

//       //   for (const line of lines) {
//       //     if (line.startsWith('data: ')) {
//       //       const data = line.slice(6);

//       //       if (data === '[DONE]') {
//       //         setGenerateText(accumulatedOutput);
//       //         setLoading(false);
//       //         return;
//       //       }

//       //       try {
//       //         const parsed = JSON.parse(data);

//       //         if (parsed.content) {
//       //           accumulatedOutput += parsed.content;
//       //           setOutput(accumulatedOutput);
//       //         }

//       //         if (parsed.error) {
//       //           alert(parsed.error);
//       //           setLoading(false);
//       //           return;
//       //         }
//       //       } catch (e) {
//       //         console.error('Error parsing SSE data:', e);
//       //       }
//       //     }
//       //   }
//       // }
//       // setGenerateText(accumulatedOutput);


//       const reader = res.body.getReader();
//       const decoder = new TextDecoder();

//       let accumulatedOutput = "";

//       while (true) {
//         const { done, value } = await reader.read();

//         if (done) break;

//         const chunk = decoder.decode(value);

//         console.log("UI CHUNK:", chunk); // 🔥 debug

//         accumulatedOutput += chunk;

//         setOutput(accumulatedOutput);
//       }
//       setGenerateText(accumulatedOutput);
      
//     } catch (err) {
//       console.error("Generation error:", err);
//       alert("Server error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFileUpload = (event) => {
//     const newFiles = Array.from(event.target.files);

//     // Validate file types
//     const allowedTypes = [
//       'text/plain',
//       'application/pdf',
//       'application/msword',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'text/csv',
//       'text/markdown',
//       'application/json'
//     ];

//     const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.csv', '.md', '.json'];

//     const validFiles = newFiles.filter(file => {
//       const isValidType = allowedTypes.includes(file.type);
//       const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

//       if (!isValidType && !hasValidExtension) {
//         alert(`File "${file.name}" is not allowed. Only text, PDF, and document files are accepted.`);
//         return false;
//       }
//       return true;
//     });

//     setFiles((prev) => [...prev, ...validFiles]);
//   };

//   const removeFile = (index) => {
//     setFiles((prev) => prev.filter((_, i) => i !== index));
//   };

//   return (
//     <>
//       <Navbar />

//       <div className="page" style={{ padding: 0 }}>
//         <div className="generate-layout">
          
//           {/* LEFT PANEL (1/3) */}
//           <div className="generate-left">
//             <h3 style={{ marginBottom: 12 }}>System Prompt (Optional)</h3>

//             <textarea
//               className="prompt-textarea"
//               rows={5}
//               placeholder="Enter system instructions (optional)..."
//               value={systemPrompt}
//               onChange={(e) => setSystemPrompt(e.target.value)}
//               style={{ marginBottom: 16 }}
//             />

//             <h3 style={{ marginBottom: 12 }}>User Prompt</h3>

//             <textarea
//               className="prompt-textarea"
//               rows={8}
//               placeholder="Describe what you want to generate...&#10;&#10;Tip: Use {file_1}, {file_2}, etc. to reference uploaded files"
//               value={userPrompt}
//               onChange={(e) => setUserPrompt(e.target.value)}
//             />
//             {files.length > 0 && (
//               <div style={{
//                 fontSize: '12px',
//                 color: '#374151',
//                 marginTop: 8,
//                 padding: '8px 12px',
//                 background: '#f9fafb',
//                 borderRadius: '6px',
//                 border: '1px solid #e5e7eb'
//               }}>
//                 <div style={{ fontWeight: '600', marginBottom: 4 }}>💡 Available placeholders:</div>
//                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
//                   {files.map((_, index) => (
//                     <code key={index} style={{
//                       background: '#ffffff',
//                       padding: '3px 6px',
//                       borderRadius: '4px',
//                       color: '#dc2626',
//                       fontSize: '11px',
//                       border: '1px solid #e5e7eb'
//                     }}>
//                       {`{file_${index + 1}}`}
//                     </code>
//                   ))}
//                 </div>
//               </div>
//             )}

//             <div style={{ marginTop: 16 }}>
//               <h3 style={{ marginBottom: 12 }}>Upload Files (Optional)</h3>
//               <input
//                 type="file"
//                 multiple
//                 accept=".txt,.pdf,.doc,.docx,.csv,.md,.json,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                 onChange={handleFileUpload}
//                 style={{ marginBottom: 8 }}
//               />
//               <p style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
//                 Allowed: Text (.txt), PDF (.pdf), Word (.doc, .docx), CSV (.csv), Markdown (.md), JSON (.json)
//               </p>
//               {files.length > 0 && (
//                 <div style={{ marginTop: 8 }}>
//                   <strong>Selected files:</strong>
//                   <ul style={{ marginTop: 4, paddingLeft: 20 }}>
//                     {files.map((file, index) => (
//                       <li key={index} style={{ marginBottom: 8 }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
//                           <code style={{
//                             background: '#f3f4f6',
//                             padding: '2px 6px',
//                             borderRadius: '4px',
//                             color: '#dc2626',
//                             fontSize: '12px',
//                             fontWeight: '600'
//                           }}>
//                             {`{file_${index + 1}}`}
//                           </code>
//                           <span style={{ color: '#6b7280' }}>→</span>
//                           <span style={{ fontWeight: '500' }}>{file.name}</span>
//                           <span style={{ color: '#6b7280', fontSize: '11px' }}>
//                             ({(file.size / 1024).toFixed(2)} KB)
//                           </span>
//                           <button
//                             onClick={() => removeFile(index)}
//                             style={{
//                               marginLeft: 'auto',
//                               padding: "4px 10px",
//                               fontSize: "11px",
//                               cursor: "pointer",
//                               background: '#fee2e2',
//                               color: '#dc2626',
//                               border: '1px solid #fecaca',
//                               borderRadius: '4px'
//                             }}
//                           >
//                             Remove
//                           </button>
//                         </div>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>

//             <button
//               className="button"
//               onClick={handleGenerate}
//               disabled={loading}
//               style={{ marginTop: 16 }}
//             >
//               {loading ? "Generating..." : "Generate"}
//             </button>
//           </div>

//           {/* RIGHT PANEL (2/3) */}
//           <div className="generate-right">
//             <div className="panel-header">
//               <h3>Generated Output</h3>
//               {loading && (
//                 <div style={{
//                   fontSize: '13px',
//                   color: '#059669',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '6px'
//                 }}>
//                   <span className="streaming-dot"></span>
//                   Streaming...
//                 </div>
//               )}
//             </div>
//             {output ? (
//               <div className="output-markdown">
//                 <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
//               </div>
//             ) : (
//               <div className="output-placeholder">
//                 Generated text will appear here
//               </div>
//             )}
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }
