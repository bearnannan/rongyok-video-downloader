use crate::parser::RongyokParser;
use crate::state::save_state;
use crate::types::{DownloadProgressEvent, DownloadState, EpisodeInfo, LogMessage};
use futures_util::StreamExt;
use reqwest::header::{RANGE, USER_AGENT};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;


#[derive(Clone)]
pub struct VideoDownloader {
    parser: RongyokParser,
    is_paused: Arc<AtomicBool>,
    is_cancelled: Arc<AtomicBool>,
}

impl VideoDownloader {
    pub fn new(parser: RongyokParser) -> Self {
        Self {
            parser,
            is_paused: Arc::new(AtomicBool::new(false)),
            is_cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn pause(&self) {
        self.is_paused.store(true, Ordering::SeqCst);
    }

    pub fn resume(&self) {
        self.is_paused.store(false, Ordering::SeqCst);
    }

    pub fn cancel(&self) {
        self.is_cancelled.store(true, Ordering::SeqCst);
    }

    pub fn reset_controls(&self) {
        self.is_paused.store(false, Ordering::SeqCst);
        self.is_cancelled.store(false, Ordering::SeqCst);
    }

    pub fn is_cancelled(&self) -> bool {
        self.is_cancelled.load(Ordering::SeqCst)
    }

    pub fn get_episode_filename(output_dir: &str, episode: u32) -> PathBuf {
        Path::new(output_dir).join(format!("ep_{:02}.mp4", episode))
    }

    pub async fn download_episode(
        &self,
        episode_info: &EpisodeInfo,
        output_dir: &str,
        total_episodes_in_batch: u32,
        current_batch_index: u32,
        app: &AppHandle,
    ) -> Result<bool, String> {
        let output_file = Self::get_episode_filename(output_dir, episode_info.episode_number);
        let temp_file = Path::new(output_dir).join(format!("ep_{:02}.mp4.part", episode_info.episode_number));

        // Create output directory if needed
        tokio::fs::create_dir_all(output_dir)
            .await
            .map_err(|e| format!("Failed to create output directory: {}", e))?;

        // Check for existing partial download
        let mut downloaded_bytes: u64 = 0;
        if temp_file.exists() {
            if let Ok(meta) = tokio::fs::metadata(&temp_file).await {
                downloaded_bytes = meta.len();
            }
        }

        let client = reqwest::Client::new();
        let mut req = client
            .get(&episode_info.video_url)
            .header(
                USER_AGENT,
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            )
            .header("Referer", "https://rongyok.com/")
            .header("Accept", "*/*")
            .header("Sec-Fetch-Dest", "video")
            .header("Sec-Fetch-Mode", "no-cors")
            .header("Sec-Fetch-Site", "cross-site");

        if downloaded_bytes > 0 {
            req = req.header(RANGE, format!("bytes={}-", downloaded_bytes));
        }

        let response = req
            .send()
            .await
            .map_err(|e| format!("Network request failed: {}", e))?;

        let status = response.status();
        let total_bytes = if status == reqwest::StatusCode::PARTIAL_CONTENT {
            if let Some(cr) = response.headers().get("content-range").and_then(|h| h.to_str().ok()) {
                if let Some(total_str) = cr.split('/').last() {
                    total_str.parse::<u64>().unwrap_or(0)
                } else {
                    0
                }
            } else {
                0
            }
        } else if status == reqwest::StatusCode::OK {
            downloaded_bytes = 0; // Server doesn't support range
            response.content_length().unwrap_or(0)
        } else {
            return Err(format!("Server returned HTTP status {}", status));
        };

        // Open temp file
        let mut file = if downloaded_bytes > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT {
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&temp_file)
                .await
                .map_err(|e| format!("Failed to open temp file for appending: {}", e))?
        } else {
            OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(true)
                .open(&temp_file)
                .await
                .map_err(|e| format!("Failed to create temp file: {}", e))?
        };

        let mut stream = response.bytes_stream();
        let mut start_time = Instant::now();
        let mut bytes_since_last_tick: u64 = 0;
        let mut last_progress_emit = Instant::now();

        while let Some(chunk_result) = stream.next().await {
            // Check pause / cancel
            while self.is_paused.load(Ordering::SeqCst) && !self.is_cancelled.load(Ordering::SeqCst) {
                tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
            }

            if self.is_cancelled.load(Ordering::SeqCst) {
                return Ok(false);
            }

            let chunk = chunk_result.map_err(|e| format!("Error streaming chunk: {}", e))?;
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("Failed to write to file: {}", e))?;

            downloaded_bytes += chunk.len() as u64;
            bytes_since_last_tick += chunk.len() as u64;

            // Emit progress event every 300ms
            if last_progress_emit.elapsed().as_millis() >= 300 {
                let elapsed_secs = start_time.elapsed().as_secs_f64();
                let speed_bytes_per_sec = if elapsed_secs > 0.0 {
                    bytes_since_last_tick as f64 / elapsed_secs
                } else {
                    0.0
                };

                let speed_formatted = format!("{:.2} MB/s", speed_bytes_per_sec / (1024.0 * 1024.0));

                let remaining_bytes = if total_bytes > downloaded_bytes {
                    total_bytes - downloaded_bytes
                } else {
                    0
                };

                let eta_formatted = if speed_bytes_per_sec > 0.0 && remaining_bytes > 0 {
                    let eta_secs = (remaining_bytes as f64 / speed_bytes_per_sec) as u64;
                    let mins = eta_secs / 60;
                    let secs = eta_secs % 60;
                    format!("{:02}:{:02}", mins, secs)
                } else {
                    "--:--".to_string()
                };

                let percentage = if total_bytes > 0 {
                    (downloaded_bytes as f64 / total_bytes as f64) * 100.0
                } else {
                    0.0
                };

                let _ = app.emit(
                    "download-progress",
                    DownloadProgressEvent {
                        episode: episode_info.episode_number,
                        total_episodes: total_episodes_in_batch,
                        current_episode_index: current_batch_index,
                        downloaded_bytes,
                        total_bytes,
                        percentage,
                        speed_bytes_per_sec,
                        speed_formatted,
                        eta_formatted,
                        status_message: format!(
                            "Downloading Episode {} ({:.1}%)",
                            episode_info.episode_number, percentage
                        ),
                    },
                );

                bytes_since_last_tick = 0;
                start_time = Instant::now();
                last_progress_emit = Instant::now();
            }
        }

        file.flush()
            .await
            .map_err(|e| format!("Failed to flush file: {}", e))?;
        drop(file);

        // Atomic replace temp file -> output file
        if output_file.exists() {
            let _ = tokio::fs::remove_file(&output_file).await;
        }

        tokio::fs::rename(&temp_file, &output_file)
            .await
            .map_err(|e| format!("Failed to rename temp file to output file: {}", e))?;

        Ok(true)
    }

    pub async fn download_batch(
        &self,
        series_id: u32,
        series_title: String,
        episodes: Vec<u32>,
        output_dir: String,
        auto_merge: bool,
        delete_parts: bool,
        app: AppHandle,
    ) -> Result<(), String> {
        self.reset_controls();

        let mut completed_episodes = Vec::new();
        let total_eps = episodes.len() as u32;

        let mut state = DownloadState {
            series_id,
            series_title: series_title.clone(),
            total_episodes: total_eps,
            output_dir: output_dir.clone(),
            selected_episodes: episodes.clone(),
            completed_episodes: Vec::new(),
            current_episode: None,
            current_progress: None,
        };

        save_state(&state, &output_dir)?;

        for (idx, &ep_num) in episodes.iter().enumerate() {
            if self.is_cancelled() {
                break;
            }

            state.current_episode = Some(ep_num);
            save_state(&state, &output_dir)?;

            let _ = app.emit(
                "log-message",
                LogMessage {
                    id: format!("{}-ep-{}", series_id, ep_num),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    level: "info".to_string(),
                    text: format!("Resolving dynamic stream for Episode {}...", ep_num),
                },
            );

            // Fetch dynamic stream URL
            let ep_info = match self.parser.get_episode_video_url(series_id, ep_num).await {
                Ok(info) => info,
                Err(e) => {
                    let _ = app.emit(
                        "log-message",
                        LogMessage {
                            id: format!("{}-err-{}", series_id, ep_num),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            level: "error".to_string(),
                            text: format!("Failed to get stream for Episode {}: {}", ep_num, e),
                        },
                    );
                    continue;
                }
            };

            let _ = app.emit(
                "log-message",
                LogMessage {
                    id: format!("{}-start-{}", series_id, ep_num),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    level: "info".to_string(),
                    text: format!("Starting download for Episode {}...", ep_num),
                },
            );

            match self
                .download_episode(&ep_info, &output_dir, total_eps, (idx + 1) as u32, &app)
                .await
            {
                Ok(true) => {
                    completed_episodes.push(ep_num);
                    state.completed_episodes = completed_episodes.clone();
                    save_state(&state, &output_dir)?;

                    let _ = app.emit(
                        "log-message",
                        LogMessage {
                            id: format!("{}-done-{}", series_id, ep_num),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            level: "success".to_string(),
                            text: format!("Episode {} download completed successfully.", ep_num),
                        },
                    );
                }
                Ok(false) => {
                    let _ = app.emit(
                        "log-message",
                        LogMessage {
                            id: format!("{}-cancel-{}", series_id, ep_num),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            level: "warning".to_string(),
                            text: format!("Download cancelled on Episode {}.", ep_num),
                        },
                    );
                    break;
                }
                Err(e) => {
                    let _ = app.emit(
                        "log-message",
                        LogMessage {
                            id: format!("{}-fail-{}", series_id, ep_num),
                            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                            level: "error".to_string(),
                            text: format!("Episode {} failed: {}", ep_num, e),
                        },
                    );
                }
            }
        }

        // Auto Merge if requested
        if auto_merge && !self.is_cancelled() && completed_episodes.len() >= 2 {
            let _ = app.emit(
                "log-message",
                LogMessage {
                    id: format!("{}-merge-start", series_id),
                    timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                    level: "info".to_string(),
                    text: format!("Merging {} downloaded episodes into unified MP4...", completed_episodes.len()),
                },
            );

            let merger = crate::merger::VideoMerger::new();
            if merger.is_available() {
                let mut video_files = Vec::new();
                for &ep in &completed_episodes {
                    let path = Self::get_episode_filename(&output_dir, ep);
                    if path.exists() {
                        video_files.push(path);
                    }
                }

                // Sanitize title for filename
                let clean_title = series_title
                    .replace(['<', '>', ':', '"', '/', '\\', '|', '?', '*'], "")
                    .trim()
                    .to_string();

                let out_merged = Path::new(&output_dir).join(format!("{}.mp4", clean_title));

                match merger.merge_videos(&video_files, &out_merged, delete_parts).await {
                    Ok(_) => {
                        let _ = app.emit(
                            "log-message",
                            LogMessage {
                                id: format!("{}-merge-success", series_id),
                                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                                level: "success".to_string(),
                                text: format!("Video merged successfully: {:?}", out_merged),
                            },
                        );
                    }
                    Err(e) => {
                        let _ = app.emit(
                            "log-message",
                            LogMessage {
                                id: format!("{}-merge-fail", series_id),
                                timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
                                level: "error".to_string(),
                                text: format!("FFmpeg merge error: {}", e),
                            },
                        );
                    }
                }
            }
        }

        state.current_episode = None;
        save_state(&state, &output_dir)?;

        Ok(())
    }
}
