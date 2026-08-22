import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { execFile, spawn, ChildProcess } from "child_process";

let activeDownloadProcess: ChildProcess | null = null;

function liveScraperPlugin(): Plugin {
  return {
    name: "live-scraper-plugin",
    configureServer(server) {
      // 1. Live Metadata Scraper
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

      // 2. Poster Image Stream Proxy (Bypasses anti1.png)
      server.middlewares.use("/api/proxy-image", (req, res) => {
        const urlObj = new URL(req.url || "", "http://localhost:1420");
        const targetUrl = urlObj.searchParams.get("url");

        if (!targetUrl) {
          res.statusCode = 400;
          res.end("Missing url parameter");
          return;
        }

        execFile(
          "python",
          ["-X", "utf8", "scrape_series.py", "--image", targetUrl],
          {
            cwd: process.cwd(),
            encoding: "buffer",
            maxBuffer: 20 * 1024 * 1024,
          },
          (error, stdout) => {
            if (error) {
              res.statusCode = 500;
              res.end(error.message);
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "image/webp");
            res.setHeader("Cache-Control", "public, max-age=86400");
            res.end(stdout);
          }
        );
      });

      // 3. Live HTTP Stream Downloader Engine with Real Disk Writes
      server.middlewares.use("/api/start-download", (req, res) => {
        const urlObj = new URL(req.url || "", "http://localhost:1420");
        const seriesId = urlObj.searchParams.get("series_id") || "941";
        const seriesTitle = urlObj.searchParams.get("series_title") || "Series";
        const episodes = urlObj.searchParams.get("episodes") || "1";
        const outputDir = urlObj.searchParams.get("output_dir") || "./output";
        const autoMerge = urlObj.searchParams.get("auto_merge") === "true";
        const deleteAfterMerge = urlObj.searchParams.get("delete_after_merge") === "true";

        if (activeDownloadProcess) {
          try {
            activeDownloadProcess.kill();
          } catch {
            // ignore
          }
          activeDownloadProcess = null;
        }

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const args = [
          "-u",
          "-X",
          "utf8",
          "downloader_engine.py",
          "--series-id",
          seriesId,
          "--series-title",
          seriesTitle,
          "--episodes",
          episodes,
          "--output-dir",
          outputDir,
        ];
        if (autoMerge) args.push("--auto-merge");
        if (deleteAfterMerge) args.push("--delete-after-merge");

        const child = spawn("python", args, {
          cwd: process.cwd(),
          env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
        });

        activeDownloadProcess = child;

        child.stdout.on("data", (chunk: Buffer) => {
          res.write(chunk);
        });

        child.stderr.on("data", (chunk: Buffer) => {
          console.error("[Downloader STDERR]:", chunk.toString("utf-8"));
        });

        child.on("close", () => {
          activeDownloadProcess = null;
          res.end();
        });

        req.on("close", () => {
          if (activeDownloadProcess === child) {
            try {
              child.kill();
            } catch {
              // ignore
            }
            activeDownloadProcess = null;
          }
        });
      });

      // 4. Cancel Download
      server.middlewares.use("/api/cancel-download", (_req, res) => {
        if (activeDownloadProcess) {
          try {
            activeDownloadProcess.kill();
          } catch {
            // ignore
          }
          activeDownloadProcess = null;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
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
