import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT) || 5173,
    host: true,
    allowedHosts: true,
    proxy: {
    "/api": {
      target: "https://radioai.onrender.com",
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
    }
  }
  }
});
