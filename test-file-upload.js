const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node:fetch');

async function testFileUpload() {
  try {
    console.log('Step 1: Logging in...');

    // Login first to get authentication cookie
    const loginResponse = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@gmail.com',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }

    // Extract the cookie from login response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Login successful! Cookie:', setCookieHeader);

    console.log('\nStep 2: Uploading file with prompt...');

    // Create form data with file and prompts
    const formData = new FormData();
    formData.append('systemPrompt', 'You are a helpful assistant that analyzes server logs.');
    formData.append('userPrompt', 'Please analyze this medical application server log file and summarize:\n1. Total number of API requests\n2. Most common endpoints\n3. Any errors or warnings\n4. Time range of the logs');

    // Read and attach the log file
    const fileBuffer = fs.readFileSync('/Users/bharatpatil/projects/RnD_project1/medsum-logs-2026-01-31-3-5-PM.txt');
    formData.append('files', fileBuffer, {
      filename: 'medsum-logs-2026-01-31-3-5-PM.txt',
      contentType: 'text/plain'
    });

    // Send the generate request with cookie
    const generateResponse = await fetch('http://localhost:5000/generate', {
      method: 'POST',
      headers: {
        'Cookie': setCookieHeader,
      },
      body: formData
    });

    if (!generateResponse.ok) {
      console.error('Generate request failed:', generateResponse.status);
      const errorText = await generateResponse.text();
      console.error('Error:', errorText);
      return;
    }

    const result = await generateResponse.json();

    console.log('\n=== AI Response ===');
    console.log(result.output);
    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error);
  }
}

testFileUpload();
