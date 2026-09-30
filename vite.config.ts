import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    // The Firebase SDK chunk alone is ~640 kB minified; warn only beyond that.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Firebase is most of the bundle and changes far less often than app
        // code, so keep it in its own long-cached chunk across releases.
        codeSplitting: {
          groups: [
            { name: "firebase", test: /[\\/]node_modules[\\/](@?firebase)[\\/]/ },
          ],
        },
      },
    },
  },
});
