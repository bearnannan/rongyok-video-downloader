use crate::downloader::VideoDownloader;
use crate::merger::VideoMerger;
use crate::parser::RongyokParser;
use crate::state::load_state;
use crate::types::{DownloadState, SeriesInfo};
use std::sync::Arc;
use tauri::{AppHandle, State};

pub struct AppState {
    pub parser: RongyokParser,
    pub downloader: VideoDownloader,
}

#[tauri::command]
pub async fn fetch_series_info(url: String, state: State<'_, Arc<AppState>>) -> Result<SeriesInfo, String> {
    let series_id = state
        .parser
        .parse_series_url(&url)
        .ok_or_else(|| "Invalid Rongyok URL. Could not parse series ID.".to_string())?;

    state.parser.get_series_info(series_id, true).await
}

#[tauri::command]
pub async fn start_download(
    series_id: u32,
    series_title: String,
    episodes: Vec<u32>,
    output_dir: String,
    auto_merge: bool,
    delete_after_merge: bool,
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let downloader = state.downloader.clone();
    tokio::spawn(async move {
        let _ = downloader
            .download_batch(
                series_id,
                series_title,
                episodes,
                output_dir,
                auto_merge,
                delete_after_merge,
                app,
            )
            .await;
    });

    Ok(())
}

#[tauri::command]
pub fn pause_download(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.downloader.pause();
    Ok(())
}

#[tauri::command]
pub fn resume_download(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.downloader.resume();
    Ok(())
}

#[tauri::command]
pub fn cancel_download(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.downloader.cancel();
    Ok(())
}

#[tauri::command]
pub fn load_previous_state(output_dir: String) -> Result<Option<DownloadState>, String> {
    Ok(load_state(&output_dir))
}

#[tauri::command]
pub fn check_ffmpeg() -> Result<serde_json::Value, String> {
    let merger = VideoMerger::new();
    let available = merger.is_available();
    let path = merger
        .ffmpeg_path
        .map(|p| p.to_string_lossy().to_string());

    Ok(serde_json::json!({
        "available": available,
        "path": path,
    }))
}

#[tauri::command]
pub async fn select_directory(
    _default_path: Option<String>,
    _app: AppHandle,
) -> Result<Option<String>, String> {
    // Return standard folder dialog or fallback
    Ok(None)
}
