export interface SeriesInfo {
  series_id: number;
  title: string;
  total_episodes: number;
  poster_url: string | null;
  episode_urls: Record<number, string>;
}

export interface EpisodeInfo {
  episode_number: number;
  title: string;
  video_url: string;
}

export interface DownloadProgressEvent {
  episode: number;
  total_episodes: number;
  current_episode_index: number;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  speed_bytes_per_sec: number;
  speed_formatted: string;
  eta_formatted: string;
  status_message: string;
}

export interface DownloadState {
  series_id: number;
  series_title: string;
  total_episodes: number;
  output_dir: string;
  selected_episodes: number[];
  completed_episodes: number[];
  current_episode: number | null;
}

export type DownloadStatus = "idle" | "fetching" | "downloading" | "paused" | "merging" | "completed" | "error" | "cancelled";

export interface LogMessage {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "debug";
  text: string;
}
