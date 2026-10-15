import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// يبني الواجهة مباشرة في ../wwwroot ليقدّمها خادم .NET
export default defineConfig({
  plugins: [react()],
  build: { outDir: "../wwwroot", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api": "http://localhost:5000" } },
});
