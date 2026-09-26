import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Read .env files from the repo root instead of frontend/
  envDir: resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // Top-level await in main.jsx (MSAL initialization) needs a modern target
  build: {
    target: "es2022",
  },
  server: {
    port: 3001,
    strictPort: true,
  },
});
