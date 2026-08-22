pub mod commands;
pub mod downloader;
pub mod merger;
pub mod parser;
pub mod state;
pub mod types;

use commands::AppState;
use downloader::VideoDownloader;
use parser::RongyokParser;
use std::sync::Arc;

pub fn run() {
    let parser = RongyokParser::new();
    let downloader = VideoDownloader::new(parser.clone());
    let app_state = Arc::new(AppState { parser, downloader });

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::fetch_series_info,
            commands::start_download,
            commands::pause_download,
            commands::resume_download,
            commands::cancel_download,
            commands::load_previous_state,
            commands::check_ffmpeg,
            commands::select_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
