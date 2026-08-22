import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { execFile } from "child_process";

function liveScraperPlugin(): Plugin {
  return {
    name: "live-scraper-plugin",
    configureServer(server) {
      server.middlewares.use("/api/fetch-series", (req, res) => {
        const urlObj = new URL(req.url || "", "http://localhost:1420");
        const seriesId = urlObj.searchParams.get("series_id") || "8608";

        execFile(
          "python",
          ["-X", "utf8", "scrape_series.py", seriesId],
          {
            cwd: process.cwd(),
            env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
            encoding: "buffer",
          },
          (error, stdout) => {
            if (error) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: error.message }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(stdout);
          }
        );
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-expect-error process is a nodejs global
  const isLanding = mode === "landing" || process.env.BUILD_FOR_GHPAGES === "true";
  // @ts-expect-error process is a nodejs global
  const host = process.env.TAURI_DEV_HOST;

  return {
    plugins: [react(), liveScraperPlugin()],
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
