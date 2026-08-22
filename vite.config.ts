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
  };
});
