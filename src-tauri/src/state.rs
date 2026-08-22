use crate::types::DownloadState;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

pub fn save_state(state: &DownloadState, output_dir: &str) -> Result<(), String> {
    let path = Path::new(output_dir).join("download_state.json");
    let json_str = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize download state: {}", e))?;

    let mut file = File::create(&path)
        .map_err(|e| format!("Failed to create state file {:?}: {}", path, e))?;

    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write state file: {}", e))?;

    Ok(())
}

pub fn load_state(output_dir: &str) -> Option<DownloadState> {
    let path = Path::new(output_dir).join("download_state.json");
    if !path.exists() {
        return None;
    }

    let mut file = File::open(&path).ok()?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).ok()?;

    serde_json::from_str(&contents).ok()
}

pub fn clear_state(output_dir: &str) {
    let path = Path::new(output_dir).join("download_state.json");
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
}
