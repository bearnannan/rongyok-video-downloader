import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-expect-error process is a nodejs global
  const isLanding = mode === "landing" || process.env.BUILD_FOR_GHPAGES === "true";
  // @ts-expect-error process is a nodejs global
  const host = process.env.TAURI_DEV_HOST;

  return {
    plugins: [react()],
    base: isLanding ? "/rongyok-video-downloader/" : "./",
    define: {
      "import.meta.env.VITE_APP_MODE": JSON.stringify(isLanding ? "landing" : "desktop"),
    },
    build: {
      outDir: isLanding ? "dist-pages" : "dist",
      emptyOutDir: true,
    },

    // Vite options tailored for development and Tauri integration
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      proxy: {
        "/proxy-rongyok": {
          target: "https://rongyok.com",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/proxy-rongyok/, ""),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://rongyok.com/",
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
        },
      },
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
  };
});
