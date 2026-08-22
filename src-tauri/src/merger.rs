use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::process::Command;

pub struct VideoMerger {
    pub ffmpeg_path: Option<PathBuf>,
}

impl VideoMerger {
    pub fn new() -> Self {
        let ffmpeg_path = Self::find_ffmpeg();
        Self { ffmpeg_path }
    }

    pub fn is_available(&self) -> bool {
        self.ffmpeg_path.is_some()
    }

    pub fn find_ffmpeg() -> Option<PathBuf> {
        // 1. Check PATH
        if let Ok(path) = which::which("ffmpeg") {
            return Some(path);
        }

        // 2. Check common Windows / Unix paths
        let common_paths = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
            "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
            "/opt/homebrew/bin/ffmpeg",
        ];

        for p in common_paths {
            let path = Path::new(p);
            if path.exists() {
                return Some(path.to_path_buf());
            }
        }

        None
    }

    pub async fn merge_videos(
        &self,
        video_files: &[PathBuf],
        output_path: &Path,
        delete_after_merge: bool,
    ) -> Result<(), String> {
        let ffmpeg = self
            .ffmpeg_path
            .as_ref()
            .ok_or_else(|| "FFmpeg executable not found. Please install FFmpeg.".to_string())?;

        if video_files.len() < 2 {
            return Err("Need at least 2 video files to merge.".to_string());
        }

        let parent_dir = output_path
            .parent()
            .ok_or_else(|| "Invalid output path parent directory".to_string())?;

        tokio::fs::create_dir_all(parent_dir)
            .await
            .map_err(|e| format!("Failed to create output directory: {}", e))?;

        let concat_file = parent_dir.join("concat_list.txt");

        // Write concat list
        let mut concat_content = String::new();
        for file in video_files {
            let abs_path = std::fs::canonicalize(file).unwrap_or_else(|_| file.clone());
            let path_str = abs_path.to_string_lossy();
            
            // Format for FFmpeg concat: handle Windows backslashes and single quotes
            #[cfg(windows)]
            let escaped = path_str
                .trim_start_matches(r"\\?\")
                .replace('\\', "/")
                .replace('\'', r"\'");

            #[cfg(not(windows))]
            let escaped = path_str.replace('\'', "'\\''");

            concat_content.push_str(&format!("file '{}'\n", escaped));
        }

        tokio::fs::write(&concat_file, &concat_content)
            .await
            .map_err(|e| format!("Failed to write concat_list.txt: {}", e))?;

        let status = Command::new(ffmpeg)
            .arg("-f")
            .arg("concat")
            .arg("-safe")
            .arg("0")
            .arg("-i")
            .arg(&concat_file)
            .arg("-c")
            .arg("copy")
            .arg("-y")
            .arg(output_path)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .status()
            .await
            .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

        // Cleanup concat file
        let _ = tokio::fs::remove_file(&concat_file).await;

        if !status.success() {
            return Err(format!("FFmpeg process exited with status: {}", status));
        }

        if !output_path.exists() {
            return Err("FFmpeg completed but output file was not created.".to_string());
        }

        // Delete individual parts if requested
        if delete_after_merge {
            for vf in video_files {
                let _ = tokio::fs::remove_file(vf).await;
            }
        }

        Ok(())
    }
}
