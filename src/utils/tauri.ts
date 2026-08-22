import type { SeriesInfo, DownloadProgressEvent, DownloadState, LogMessage } from "../types";

// Check if running inside Tauri native webview
export const isTauri = (): boolean => {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as any).__TAURI_INTERNALS__ ||
      (window as any).__TAURI__ ||
      (window as any).__TAURI_METADATA__
    )
  );
};

// In-browser mock EventEmitter for Web Dev Server fallback
type ListenerCallback = (data: any) => void;
class MockEmitter {
  private listeners: Map<string, Set<ListenerCallback>> = new Map();

  on(event: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, payload: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error("Error in mock event listener:", e);
      }
    });
  }
}

const mockEmitter = new MockEmitter();
let mockDownloadInterval: any = null;
let mockIsPaused = false;
let mockIsCancelled = false;

export const tauriApi = {
  fetchSeriesInfo: async (url: string): Promise<SeriesInfo> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<SeriesInfo>("fetch_series_info", { url });
    }

    // Browser Simulation Fallback
    await new Promise((r) => setTimeout(r, 400));

    // Parse series ID accurately from URL
    const trimmed = url.trim();
    let seriesId = 8626;

    if (/^\d+$/.test(trimmed)) {
      seriesId = parseInt(trimmed, 10);
    } else {
      const match = trimmed.match(/series_id=(\d+)/) || trimmed.match(/\/(?:series|watch)\/(\d+)/);
      if (match) {
        seriesId = parseInt(match[1], 10);
      }
    }

    // Dynamic metadata mapping based on seriesId
    let title = `ซีรีส์ ${seriesId} พากย์ไทย หนังสั้นจีน ฟรี - โรงหยก`;
    let totalEpisodes = 80;
    let posterUrl = `https://rongyok.com/images/poster/series-${seriesId}.jpg`;

    if (seriesId === 8626) {
      title = "ดูสายลับจับคู่รักซีซั่น8 พากย์ไทย หนังสั้นจีน ฟรี - โรงหยก";
      totalEpisodes = 124;
      posterUrl = "https://rongyok.com/images/poster/สายลับจับคู่รักซีซั่น8-พากย์ไทย-2026-8626.jpg";
    } else if (seriesId === 8625) {
      title = "ดูเกิดใหม่ครั้งนี้ไม่ขอแสร้งเป็นลูกเศรษฐี7 พากย์ไทย หนังสั้นจีน ฟรี - โรงหยก";
      totalEpisodes = 77;
      posterUrl = "https://rongyok.com/images/poster/เกิดใหม่ครั้งนี้ไม่ขอแสร้งเป็นลูกเศรษฐี7-พากย์ไทย-2026-8625.jpg";
    } else if (seriesId === 941) {
      title = "สายลับสาวทะลุมิติ พากย์ไทย หนังสั้นจีน - โรงหยก";
      totalEpisodes = 68;
      posterUrl = "https://rongyok.com/images/poster/series-941.jpg";
    }

    mockEmitter.emit("log-message", {
      id: `${Date.now()}-fetch`,
      timestamp: new Date().toTimeString().split(" ")[0],
      level: "success",
      text: `[Browser Mode] Successfully resolved metadata: "${title}" (${totalEpisodes} Episodes)`,
    });

    const episodeUrls: Record<number, string> = {};
    for (let i = 1; i <= totalEpisodes; i++) {
      episodeUrls[i] = `https://cdn.discordapp.com/attachments/1538962062842007633/1538962516871356538/ep${i < 10 ? '0' + i : i}.mp4?ex=6a8a84c8`;
    }

    return {
      series_id: seriesId,
      title,
      total_episodes: totalEpisodes,
      poster_url: posterUrl,
      episode_urls: episodeUrls,
    };
  },

  startDownload: async (
    seriesId: number,
    seriesTitle: string,
    episodes: number[],
    outputDir: string,
    autoMerge: boolean,
    deleteAfterMerge: boolean
  ): Promise<void> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<void>("start_download", {
        seriesId,
        seriesTitle,
        episodes,
        outputDir,
        autoMerge,
        deleteAfterMerge,
      });
    }

    // Browser Simulation Fallback
    mockIsPaused = false;
    mockIsCancelled = false;
    if (mockDownloadInterval) clearInterval(mockDownloadInterval);

    let currentEpIdx = 0;
    let epDownloadedBytes = 0;
    const epTotalBytes = 12724736; // 12.7 MB

    mockEmitter.emit("log-message", {
      id: `${Date.now()}-start`,
      timestamp: new Date().toTimeString().split(" ")[0],
      level: "info",
      text: `[Browser Mode] Starting download queue for ${episodes.length} episodes to ${outputDir}`,
    });

    mockDownloadInterval = setInterval(() => {
      if (mockIsCancelled) {
        clearInterval(mockDownloadInterval);
        return;
      }
      if (mockIsPaused) return;

      const epNum = episodes[currentEpIdx];
      epDownloadedBytes += 1024 * 512; // +512KB per tick

      if (epDownloadedBytes >= epTotalBytes) {
        epDownloadedBytes = 0;
        mockEmitter.emit("log-message", {
          id: `${Date.now()}-done-${epNum}`,
          timestamp: new Date().toTimeString().split(" ")[0],
          level: "success",
          text: `Episode ${epNum} downloaded successfully.`,
        });

        currentEpIdx++;
        if (currentEpIdx >= episodes.length) {
          clearInterval(mockDownloadInterval);
          mockEmitter.emit("status-change", {
            status: "completed",
            message: `Completed batch download of ${episodes.length} episodes!`,
          });
          mockEmitter.emit("log-message", {
            id: `${Date.now()}-batch-done`,
            timestamp: new Date().toTimeString().split(" ")[0],
            level: "success",
            text: `[Browser Mode] All ${episodes.length} episodes downloaded successfully!`,
          });
          return;
        }
      }

      const percent = (epDownloadedBytes / epTotalBytes) * 100;
      mockEmitter.emit("download-progress", {
        episode: episodes[currentEpIdx],
        total_episodes: episodes.length,
        current_episode_index: currentEpIdx + 1,
        downloaded_bytes: epDownloadedBytes,
        total_bytes: epTotalBytes,
        percentage: percent,
        speed_bytes_per_sec: 14.5 * 1024 * 1024,
        speed_formatted: "14.50 MB/s",
        eta_formatted: "00:03",
        status_message: `Downloading Episode ${episodes[currentEpIdx]} (${percent.toFixed(1)}%)`,
      });
    }, 150);
  },

  pauseDownload: async (): Promise<void> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<void>("pause_download");
    }
    mockIsPaused = true;
  },

  resumeDownload: async (): Promise<void> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<void>("resume_download");
    }
    mockIsPaused = false;
  },

  cancelDownload: async (): Promise<void> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<void>("cancel_download");
    }
    mockIsCancelled = true;
    if (mockDownloadInterval) clearInterval(mockDownloadInterval);
  },

  loadPreviousState: async (outputDir: string): Promise<DownloadState | null> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<DownloadState | null>("load_previous_state", { outputDir });
    }
    return null;
  },

  selectDirectory: async (defaultPath?: string): Promise<string | null> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string | null>("select_directory", { defaultPath });
    }
    return defaultPath || "./output";
  },

  checkFfmpeg: async (): Promise<{ available: boolean; path: string | null }> => {
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<{ available: boolean; path: string | null }>("check_ffmpeg");
    }
    return { available: true, path: "Browser Engine Simulation" };
  },

  onProgress: async (callback: (payload: DownloadProgressEvent) => void): Promise<() => void> => {
    if (isTauri()) {
      const { listen } = await import("@tauri-apps/api/event");
      return await listen<DownloadProgressEvent>("download-progress", (event) => {
        callback(event.payload);
      });
    }
    return mockEmitter.on("download-progress", callback);
  },

  onLog: async (callback: (payload: LogMessage) => void): Promise<() => void> => {
    if (isTauri()) {
      const { listen } = await import("@tauri-apps/api/event");
      return await listen<LogMessage>("log-message", (event) => {
        callback(event.payload);
      });
    }
    return mockEmitter.on("log-message", callback);
  },

  onStatusChange: async (callback: (payload: { status: string; message: string }) => void): Promise<() => void> => {
    if (isTauri()) {
      const { listen } = await import("@tauri-apps/api/event");
      return await listen<{ status: string; message: string }>("status-change", (event) => {
        callback(event.payload);
      });
    }
    return mockEmitter.on("status-change", callback);
  },
};
