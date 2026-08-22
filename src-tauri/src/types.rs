use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesInfo {
    pub series_id: u32,
    pub title: String,
    pub total_episodes: u32,
    pub poster_url: Option<String>,
    pub episode_urls: HashMap<u32, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpisodeInfo {
    pub episode_number: u32,
    pub title: String,
    pub video_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressEvent {
    pub episode: u32,
    pub total_episodes: u32,
    pub current_episode_index: u32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub speed_bytes_per_sec: f64,
    pub speed_formatted: String,
    pub eta_formatted: String,
    pub status_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub episode: u32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadState {
    pub series_id: u32,
    pub series_title: String,
    pub total_episodes: u32,
    pub output_dir: String,
    pub selected_episodes: Vec<u32>,
    pub completed_episodes: Vec<u32>,
    pub current_episode: Option<u32>,
    pub current_progress: Option<DownloadProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogMessage {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub text: String,
}
