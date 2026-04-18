import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import GenerateOptions from "./pages/GenerateOptions";
import GenerateTextCategories from "./pages/GenerateTextCategories";
import Translate from "./pages/Translate";
import Audio from "./pages/Audio";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppProvider } from "./context/AppContext";

function App() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />

      {/* PROTECTED */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/generate"
        element={
          <ProtectedRoute>
            <Generate />
          </ProtectedRoute>
        }
      />

      <Route 
        path="/generate/options" 
        element={
        <ProtectedRoute>
          <GenerateOptions />
        </ProtectedRoute>
        } 
      />

      <Route 
        path="/generate/text" 
        element={
        <ProtectedRoute>
          <GenerateTextCategories />
        </ProtectedRoute>
        } 
      />

      <Route
        path="/translate"
        element={
          <ProtectedRoute>
            <Translate />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audio"
        element={
          <ProtectedRoute>
            <Audio />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
