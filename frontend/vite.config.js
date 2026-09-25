import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  // Read .env files from the repo root instead of frontend/
  envDir: resolve(__dirname, ".."),
  server: {
    port: 3000,
  },
});
