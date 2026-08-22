"""
Rongyok Video Downloader
Downloads videos with resume support and progress tracking
"""

import os
import json
import time
import requests
from pathlib import Path
from typing import Optional, Callable
from dataclasses import dataclass, asdict
from tqdm import tqdm

from parser import EpisodeInfo, SeriesInfo


@dataclass
class DownloadProgress:
    """Track download progress for resume"""
    episode: int
    downloaded_bytes: int
    total_bytes: int
    completed: bool = False


@dataclass
class DownloadState:
    """Overall download state for a series"""
    series_id: int
    series_title: str
    total_episodes: int
    output_dir: str
    selected_episodes: list[int]
    completed_episodes: list[int]
    current_episode: Optional[int] = None
    current_progress: Optional[DownloadProgress] = None

    def save(self, path: str):
        """Save state to JSON file"""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str) -> Optional['DownloadState']:
        """Load state from JSON file"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data.get('current_progress'):
                    data['current_progress'] = DownloadProgress(**data['current_progress'])
                return cls(**data)
        except (FileNotFoundError, json.JSONDecodeError):
            return None


class VideoDownloader:
    """Downloads videos with resume support"""

    CHUNK_SIZE = 1024 * 1024  # 1MB chunks

    def __init__(self, output_dir: str = "./output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.output_dir / "download_state.json"
        self.state: Optional[DownloadState] = None
        self._paused = False
        self._cancelled = False

        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
        })

    def pause(self):
        """Pause download"""
        self._paused = True

    def resume(self):
        """Resume download"""
        self._paused = False

    def cancel(self):
        """Cancel download"""
        self._cancelled = True

    def is_paused(self) -> bool:
        return self._paused

    def is_cancelled(self) -> bool:
        return self._cancelled

    def reset(self):
        """Reset pause/cancel state"""
        self._paused = False
        self._cancelled = False

    def init_state(self, series_info: SeriesInfo, selected_episodes: list[int]):
        """Initialize download state"""
        self.state = DownloadState(
            series_id=series_info.series_id,
            series_title=series_info.title,
            total_episodes=series_info.total_episodes,
            output_dir=str(self.output_dir),
            selected_episodes=sorted(selected_episodes),
            completed_episodes=[],
            current_episode=None,
            current_progress=None
        )
        self._save_state()

    def load_state(self) -> Optional[DownloadState]:
        """Load existing download state"""
        self.state = DownloadState.load(str(self.state_file))
        return self.state

    def _save_state(self):
        """Save current state"""
        if self.state:
            self.state.save(str(self.state_file))

    def get_episode_filename(self, episode: int) -> Path:
        """Get output filename for episode"""
        return self.output_dir / f"ep_{episode:02d}.mp4"

    def get_remaining_episodes(self) -> list[int]:
        """Get list of episodes still to download"""
        if not self.state:
            return []
        return [ep for ep in self.state.selected_episodes
                if ep not in self.state.completed_episodes]

    def download_episode(
        self,
        episode_info: EpisodeInfo,
        progress_callback: Optional[Callable[[int, int, float], None]] = None,
        use_tqdm: bool = True
    ) -> bool:
        """
        Download a single episode with resume support

        Args:
            episode_info: Episode information with video URL
            progress_callback: Optional callback(downloaded, total, speed)
            use_tqdm: Whether to show tqdm progress bar

        Returns:
            True if download completed successfully
        """
        output_file = self.get_episode_filename(episode_info.episode_number)
        temp_file = output_file.with_suffix('.mp4.part')

        # Check for existing partial download
        downloaded_bytes = 0
        if temp_file.exists():
            downloaded_bytes = temp_file.stat().st_size

        # Update state
        if self.state:
            self.state.current_episode = episode_info.episode_number

        try:
            # Make initial request to get file size
            headers = {}
            if downloaded_bytes > 0:
                headers['Range'] = f'bytes={downloaded_bytes}-'

            response = self.session.get(
                episode_info.video_url,
                headers=headers,
                stream=True,
                timeout=30
            )

            # Handle range response
            if response.status_code == 206:
                # Partial content - resuming
                content_range = response.headers.get('Content-Range', '')
                total_bytes = int(content_range.split('/')[-1]) if '/' in content_range else 0
            elif response.status_code == 200:
                # Full content - starting fresh
                total_bytes = int(response.headers.get('Content-Length', 0))
                downloaded_bytes = 0  # Server doesn't support resume
            else:
                print(f"Error: HTTP {response.status_code}")
                return False

            # Update state with progress
            if self.state:
                self.state.current_progress = DownloadProgress(
                    episode=episode_info.episode_number,
                    downloaded_bytes=downloaded_bytes,
                    total_bytes=total_bytes,
                    completed=False
                )
                self._save_state()

            # Setup progress bar
            pbar = None
            if use_tqdm:
                pbar = tqdm(
                    total=total_bytes,
                    initial=downloaded_bytes,
                    unit='B',
                    unit_scale=True,
                    desc=f"ตอนที่ {episode_info.episode_number}"
                )

            # Download with resume
            mode = 'ab' if downloaded_bytes > 0 and response.status_code == 206 else 'wb'
            start_time = time.time()
            bytes_since_last_update = 0

            with open(temp_file, mode) as f:
                for chunk in response.iter_content(chunk_size=self.CHUNK_SIZE):
                    # Check for pause/cancel
                    while self._paused and not self._cancelled:
                        time.sleep(0.1)

                    if self._cancelled:
                        if pbar:
                            pbar.close()
                        self._save_state()
                        return False

                    if chunk:
                        f.write(chunk)
                        downloaded_bytes += len(chunk)
                        bytes_since_last_update += len(chunk)

                        if pbar:
                            pbar.update(len(chunk))

                        # Calculate speed and call callback
                        if progress_callback:
                            elapsed = time.time() - start_time
                            speed = bytes_since_last_update / elapsed if elapsed > 0 else 0
                            progress_callback(downloaded_bytes, total_bytes, speed)

                        # Update state periodically
                        if self.state and bytes_since_last_update >= self.CHUNK_SIZE * 5:
                            self.state.current_progress = DownloadProgress(
                                episode=episode_info.episode_number,
                                downloaded_bytes=downloaded_bytes,
                                total_bytes=total_bytes,
                                completed=False
                            )
                            self._save_state()
                            bytes_since_last_update = 0
                            start_time = time.time()

            if pbar:
                pbar.close()

            # Rename temp file to final (use replace for Windows atomic overwrite support)
            temp_file.replace(output_file)

            # Mark as completed
            if self.state:
                if episode_info.episode_number not in self.state.completed_episodes:
                    self.state.completed_episodes.append(episode_info.episode_number)
                self.state.current_episode = None
                self.state.current_progress = None
                self._save_state()

            return True

        except requests.RequestException as e:
            print(f"Download error: {e}")
            self._save_state()
            return False

    def download_all(
        self,
        episodes: list[EpisodeInfo],
        progress_callback: Optional[Callable[[int, int, int, int], None]] = None
    ) -> tuple[int, int]:
        """
        Download multiple episodes

        Args:
            episodes: List of episode info
            progress_callback: Optional callback(current_ep, total_eps, downloaded, total_bytes)

        Returns:
            Tuple of (successful_count, failed_count)
        """
        successful = 0
        failed = 0

        for i, episode in enumerate(episodes):
            if self._cancelled:
                break

            # Skip already completed
            if self.state and episode.episode_number in self.state.completed_episodes:
                successful += 1
                continue

            print(f"\nDownloading episode {episode.episode_number}...")

            if self.download_episode(episode):
                successful += 1
            else:
                if not self._cancelled:
                    failed += 1

            if progress_callback:
                progress_callback(i + 1, len(episodes), 0, 0)

        return successful, failed

    def clear_state(self):
        """Clear download state file"""
        if self.state_file.exists():
            self.state_file.unlink()
        self.state = None


# Test
if __name__ == "__main__":
    from parser import RongyokParser

    parser = RongyokParser()
    downloader = VideoDownloader("./output")

    # Get series info
    series_info = parser.get_series_info(941)
    if series_info:
        print(f"Series: {series_info.title}")
        print(f"Episodes: {series_info.total_episodes}")

        # Initialize for first 2 episodes
        downloader.init_state(series_info, [1, 2])

        # Get episode URLs
        ep1 = parser.get_episode_video_url(941, 1)
        if ep1:
            print(f"\nDownloading episode 1...")
            success = downloader.download_episode(ep1)
            print(f"Success: {success}")
