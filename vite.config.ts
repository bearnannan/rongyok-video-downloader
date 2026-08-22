import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isGitHubPages = process.env.BUILD_FOR_GHPAGES === "true";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  base: isGitHubPages ? "/rongyok-video-downloader/" : "./",
  build: {
    outDir: isGitHubPages ? "dist-pages" : "dist",
    emptyOutDir: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
