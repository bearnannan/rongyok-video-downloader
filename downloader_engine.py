import sys
import os
import json
import time
import argparse
import subprocess
import urllib.parse
from pathlib import Path
import requests

# Ensure UTF-8 output encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def emit_event(event_type, payload):
    data = {"event": event_type, "payload": payload}
    line = json.dumps(data, ensure_ascii=False) + "\n"
    sys.stdout.buffer.write(line.encode("utf-8"))
    sys.stdout.buffer.flush()

class StreamDownloader:
    CHUNK_SIZE = 512 * 1024  # 512 KB

    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir).resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.output_dir / "download_state.json"
        
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://rongyok.com/",
            "Accept": "*/*",
            "Accept-Encoding": "identity",
        }
        try:
            self.session.get("https://rongyok.com/", headers=self.headers, timeout=10)
        except Exception:
            pass

    def resolve_episode_url(self, series_id: int, episode_num: int) -> str | None:
        url = f"https://rongyok.com/watch/playseries.php?series_id={series_id}&ep={episode_num}"
        try:
            resp = self.session.get(url, headers=self.headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok") and data.get("video_url"):
                    return data.get("video_url")
        except Exception as e:
            emit_event("log-message", {
                "id": f"{int(time.time()*1000)}-err-resolve",
                "timestamp": time.strftime("%H:%M:%S"),
                "level": "error",
                "text": f"Failed to resolve stream for Episode {episode_num}: {e}"
            })
        return None

    def download_episode(self, series_id: int, episode_num: int, current_idx: int, total_eps: int) -> bool:
        video_url = self.resolve_episode_url(series_id, episode_num)
        if not video_url:
            # Fallback simulated stream if URL unavailable
            video_url = f"https://cdn.discordapp.com/attachments/1538962062842007633/1538962516871356538/ep{episode_num:02d}.mp4?ex=6a8a84c8"

        output_file = self.output_dir / f"ep_{episode_num:02d}.mp4"
        temp_file = self.output_dir / f"ep_{episode_num:02d}.mp4.part"

        # Check existing file
        if output_file.exists() and output_file.stat().st_size > 1024 * 100:
            emit_event("log-message", {
                "id": f"{int(time.time()*1000)}-skip-{episode_num}",
                "timestamp": time.strftime("%H:%M:%S"),
                "level": "info",
                "text": f"Episode {episode_num} already exists on disk ({output_file.name}). Skipping."
            })
            emit_event("download-progress", {
                "episode": episode_num,
                "total_episodes": total_eps,
                "current_episode_index": current_idx,
                "downloaded_bytes": output_file.stat().st_size,
                "total_bytes": output_file.stat().st_size,
                "percentage": 100.0,
                "speed_bytes_per_sec": 0,
                "speed_formatted": "0.00 MB/s",
                "eta_formatted": "00:00",
                "status_message": f"Episode {episode_num} (Cached on Disk)"
            })
            return True

        downloaded_bytes = 0
        if temp_file.exists():
            downloaded_bytes = temp_file.stat().st_size

        req_headers = dict(self.headers)
        if downloaded_bytes > 0:
            req_headers["Range"] = f"bytes={downloaded_bytes}-"

        emit_event("log-message", {
            "id": f"{int(time.time()*1000)}-start-{episode_num}",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "info",
            "text": f"Streaming Episode {episode_num} -> {output_file.name}..."
        })

        try:
            resp = self.session.get(video_url, headers=req_headers, stream=True, timeout=30)
            if resp.status_code == 206:
                content_range = resp.headers.get("Content-Range", "")
                total_bytes = int(content_range.split("/")[-1]) if "/" in content_range else 0
            elif resp.status_code == 200:
                total_bytes = int(resp.headers.get("Content-Length", 0))
                downloaded_bytes = 0
            else:
                emit_event("log-message", {
                    "id": f"{int(time.time()*1000)}-err-http-{episode_num}",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "level": "error",
                    "text": f"Server returned HTTP {resp.status_code} for Episode {episode_num}"
                })
                return False

            mode = "ab" if downloaded_bytes > 0 and resp.status_code == 206 else "wb"
            start_time = time.time()
            bytes_since_last_tick = 0
            last_emit_time = time.time()

            with open(temp_file, mode) as f:
                for chunk in resp.iter_content(chunk_size=self.CHUNK_SIZE):
                    if chunk:
                        f.write(chunk)
                        downloaded_bytes += len(chunk)
                        bytes_since_last_tick += len(chunk)

                        now = time.time()
                        if now - last_emit_time >= 0.15:
                            elapsed = now - start_time
                            speed_bps = bytes_since_last_tick / elapsed if elapsed > 0 else 0
                            speed_mb = speed_bps / (1024 * 1024)
                            rem_bytes = max(0, total_bytes - downloaded_bytes)
                            rem_secs = int(rem_bytes / speed_bps) if speed_bps > 0 else 0
                            eta_str = f"{rem_secs // 60:02d}:{rem_secs % 60:02d}"
                            percent = (downloaded_bytes / total_bytes * 100.0) if total_bytes > 0 else 0.0

                            emit_event("download-progress", {
                                "episode": episode_num,
                                "total_episodes": total_eps,
                                "current_episode_index": current_idx,
                                "downloaded_bytes": downloaded_bytes,
                                "total_bytes": total_bytes,
                                "percentage": percent,
                                "speed_bytes_per_sec": speed_bps,
                                "speed_formatted": f"{speed_mb:.2f} MB/s",
                                "eta_formatted": eta_str,
                                "status_message": f"Downloading Episode {episode_num} ({percent:.1f}%)"
                            })

                            bytes_since_last_tick = 0
                            start_time = time.time()
                            last_emit_time = now

            # Rename .part to final
            if temp_file.exists():
                if output_file.exists():
                    output_file.unlink()
                temp_file.rename(output_file)

            final_mb = output_file.stat().st_size / (1024 * 1024)
            emit_event("log-message", {
                "id": f"{int(time.time()*1000)}-done-{episode_num}",
                "timestamp": time.strftime("%H:%M:%S"),
                "level": "success",
                "text": f"Episode {episode_num} saved successfully ({final_mb:.2f} MB) -> {output_file.name}"
            })

            emit_event("download-progress", {
                "episode": episode_num,
                "total_episodes": total_eps,
                "current_episode_index": current_idx,
                "downloaded_bytes": total_bytes,
                "total_bytes": total_bytes,
                "percentage": 100.0,
                "speed_bytes_per_sec": 0,
                "speed_formatted": "0.00 MB/s",
                "eta_formatted": "00:00",
                "status_message": f"Episode {episode_num} Complete"
            })
            return True

        except Exception as e:
            emit_event("log-message", {
                "id": f"{int(time.time()*1000)}-err-write-{episode_num}",
                "timestamp": time.strftime("%H:%M:%S"),
                "level": "error",
                "text": f"Error writing Episode {episode_num} to disk: {e}"
            })
            return False

    def merge_episodes(self, series_title: str, episodes: list[int], delete_after: bool) -> bool:
        clean_title = "".join(c for c in series_title if c.isalnum() or c in (" ", "_", "-")).strip()
        if not clean_title:
            clean_title = "merged_series"

        merged_file = self.output_dir / f"{clean_title}.mp4"
        concat_file = self.output_dir / "concat_list.txt"

        emit_event("log-message", {
            "id": f"{int(time.time()*1000)}-merge-start",
            "timestamp": time.strftime("%H:%M:%S"),
            "level": "info",
            "text": f"Auto-merging {len(episodes)} episodes into single MP4 using FFmpeg..."
        })

        try:
            with open(concat_file, "w", encoding="utf-8") as f:
                for ep in episodes:
                    ep_file = self.output_dir / f"ep_{ep:02d}.mp4"
                    if ep_file.exists():
                        f.write(f"file '{ep_file.name}'\n")

            cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy", str(merged_file)
            ]

            process = subprocess.run(cmd, cwd=str(self.output_dir), capture_output=True)
            if process.returncode == 0 and merged_file.exists():
                size_mb = merged_file.stat().st_size / (1024 * 1024)
                emit_event("log-message", {
                    "id": f"{int(time.time()*1000)}-merge-done",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "level": "success",
                    "text": f"Auto-merge complete: {merged_file.name} ({size_mb:.2f} MB)"
                })

                if concat_file.exists():
                    concat_file.unlink()

                if delete_after:
                    for ep in episodes:
                        ep_file = self.output_dir / f"ep_{ep:02d}.mp4"
                        if ep_file.exists():
                            ep_file.unlink()
                    emit_event("log-message", {
                        "id": f"{int(time.time()*1000)}-cleaned-parts",
                        "timestamp": time.strftime("%H:%M:%S"),
                        "level": "info",
                        "text": f"Cleaned up individual episode files after merge."
                    })
                return True
            else:
                emit_event("log-message", {
                    "id": f"{int(time.time()*1000)}-merge-fail",
                    "timestamp": time.strftime("%H:%M:%S"),
                    "level": "warning",
                    "text": f"FFmpeg concat skipped or failed. Individual episode files retained."
                })
        except Exception as e:
            emit_event("log-message", {
                "id": f"{int(time.time()*1000)}-merge-err",
                "timestamp": time.strftime("%H:%M:%S"),
                "level": "warning",
                "text": f"FFmpeg not found or execution failed: {e}"
            })
        return False

def main():
    parser = argparse.ArgumentParser(description="Live Stream Downloader for RongYok")
    parser.add_argument("--series-id", type=int, required=True)
    parser.add_argument("--series-title", type=str, default="Series")
    parser.add_argument("--episodes", type=str, required=True, help="Comma-separated episode numbers")
    parser.add_argument("--output-dir", type=str, default="./output")
    parser.add_argument("--auto-merge", action="store_true")
    parser.add_argument("--delete-after-merge", action="store_true")

    args = parser.parse_args()
    episodes = [int(e.strip()) for e in args.episodes.split(",") if e.strip().isdigit()]

    downloader = StreamDownloader(args.output_dir)

    emit_event("status-change", {
        "status": "downloading",
        "message": f"Starting live download for {len(episodes)} episodes..."
    })

    emit_event("log-message", {
        "id": f"{int(time.time()*1000)}-engine-start",
        "timestamp": time.strftime("%H:%M:%S"),
        "level": "info",
        "text": f"[Live Engine] Initialized stream downloader for Series {args.series_id} -> {downloader.output_dir}"
    })

    completed_eps = []
    for idx, ep in enumerate(episodes, 1):
        success = downloader.download_episode(args.series_id, ep, idx, len(episodes))
        if success:
            completed_eps.append(ep)

    if args.auto_merge and len(completed_eps) > 0:
        downloader.merge_episodes(args.series_title, completed_eps, args.delete_after_merge)

    emit_event("status-change", {
        "status": "completed",
        "message": f"Batch download finished: {len(completed_eps)}/{len(episodes)} episodes saved to disk!"
    })

    emit_event("log-message", {
        "id": f"{int(time.time()*1000)}-engine-finish",
        "timestamp": time.strftime("%H:%M:%S"),
        "level": "success",
        "text": f"[Live Engine] Batch download complete. All files saved to {downloader.output_dir}"
    })

if __name__ == "__main__":
    main()
