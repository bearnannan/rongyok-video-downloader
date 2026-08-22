"""
Rongyok Episode Parser
Extracts video URLs and episode information from rongyok.com
"""

import re
import json
import requests
from bs4 import BeautifulSoup
from typing import Optional
from dataclasses import dataclass


@dataclass
class SeriesInfo:
    """Information about a video series"""
    series_id: int
    title: str
    total_episodes: int
    poster_url: Optional[str] = None
    episode_urls: dict[int, str] = None  # Cache all episode URLs


@dataclass
class EpisodeInfo:
    """Information about a single episode"""
    episode_number: int
    title: str
    video_url: str


class RongyokParser:
    """Parser for rongyok.com video pages"""

    BASE_URL = "https://rongyok.com/watch/"
    API_URL = "https://rongyok.com/watch/playseries.php"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
            'Referer': 'https://rongyok.com/',
        })
        self._cached_series: dict[int, SeriesInfo] = {}

    def parse_series_url(self, url: str) -> Optional[int]:
        """Extract series_id from URL

        Supports multiple URL formats:
        - https://rongyok.com/watch/?series_id=941
        - https://rongyok.com/series/941/title-here
        - https://rongyok.com/series/941/%E0%B8%... (URL-encoded)
        """
        # Format 1: ?series_id=XXX
        match = re.search(r'series_id=(\d+)', url)
        if match:
            return int(match.group(1))

        # Format 2: /series/XXX/ or /series/XXX
        match = re.search(r'/series/(\d+)(?:/|$)', url)
        if match:
            return int(match.group(1))

        return None

    def get_series_info(self, series_id: int, force_refresh: bool = False) -> Optional[SeriesInfo]:
        """Get series information including total episodes and all video URLs"""

        # Return cached if available
        if not force_refresh and series_id in self._cached_series:
            return self._cached_series[series_id]

        url = f"{self.BASE_URL}?series_id={series_id}"

        try:
            self.session.headers.update({'Referer': url})
            response = self.session.get(url, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            html = response.text

            # Get title from page
            title_tag = soup.find('title')
            title = title_tag.text.strip() if title_tag else f"Series {series_id}"
            # Clean title - remove " - ตอนที่ X" suffix
            title = re.sub(r'\s*-\s*ตอนที่\s*\d+.*$', '', title)

            # Get poster URL
            poster_url = None
            og_image = soup.find('meta', property='og:image')
            if og_image:
                poster_url = og_image.get('content')

            # Extract all episode URLs from seriesData JavaScript object
            episode_urls = self._extract_all_episode_urls(html)

            # Get total episodes (from seriesData JSON, inline URLs, or meta description)
            total_episodes = len(episode_urls) if episode_urls else self._extract_total_episodes(soup, html)

            series_info = SeriesInfo(
                series_id=series_id,
                title=title,
                total_episodes=total_episodes,
                poster_url=poster_url,
                episode_urls=episode_urls if episode_urls else {}
            )

            # Cache it
            self._cached_series[series_id] = series_info

            return series_info

        except requests.RequestException as e:
            print(f"Error fetching series info: {e}")
            return None

    def _extract_all_episode_urls(self, html: str) -> dict[int, str]:
        """Extract all episode URLs from seriesData JavaScript object"""
        episode_urls = {}

        # URLs are escaped in JavaScript with \/ instead of /
        # Pattern matches both escaped and unescaped URLs

        # Pattern 1: Discord CDN with numeric filename (e.g., 1.mp4, 2.mp4)
        pattern1 = r'https?:(?:\\/\\/|//)cdn\.discordapp\.com(?:\\/|/)attachments(?:\\/|/)(\d+)(?:\\/|/)(\d+)(?:\\/|/)(\d+)\.mp4\?[^"\'<>\s]+'

        for match in re.finditer(pattern1, html):
            full_url = match.group(0)
            ep_num = int(match.group(3))  # Episode number is the filename

            # Unescape JavaScript escapes
            full_url = full_url.replace('\\/', '/')
            full_url = full_url.replace('\\u0026', '&')
            full_url = full_url.replace('&amp;', '&')

            if ep_num not in episode_urls or len(full_url) > len(episode_urls[ep_num]):
                episode_urls[ep_num] = full_url

        # Pattern 2: Discord CDN with EP prefix (e.g., EP01.mp4, EP02.mp4)
        pattern2 = r'https?:(?:\\/\\/|//)cdn\.discordapp\.com(?:\\/|/)attachments(?:\\/|/)(\d+)(?:\\/|/)(\d+)(?:\\/|/)EP(\d+)\.mp4\?[^"\'<>\s]+'

        for match in re.finditer(pattern2, html, re.IGNORECASE):
            full_url = match.group(0)
            ep_num = int(match.group(3))  # Episode number from EP01, EP02, etc.

            # Unescape JavaScript escapes
            full_url = full_url.replace('\\/', '/')
            full_url = full_url.replace('\\u0026', '&')
            full_url = full_url.replace('&amp;', '&')

            if ep_num not in episode_urls or len(full_url) > len(episode_urls[ep_num]):
                episode_urls[ep_num] = full_url

        # Pattern 3: Generic video_url in JSON (fallback)
        pattern3 = r'"video_url"\s*:\s*"(https?:[^"]+\.mp4[^"]*)"'

        for match in re.finditer(pattern3, html):
            full_url = match.group(1)
            full_url = full_url.replace('\\/', '/')
            full_url = full_url.replace('\\u0026', '&')

            # Try to extract episode number from URL
            ep_match = re.search(r'[/\\](?:EP)?(\d+)\.mp4', full_url, re.IGNORECASE)
            if ep_match:
                ep_num = int(ep_match.group(1))
                if ep_num not in episode_urls:
                    episode_urls[ep_num] = full_url

        return episode_urls

    def _extract_total_episodes(self, soup: BeautifulSoup, html: str) -> int:
        """Extract total episode count from page"""
        # Method 1: Look for seriesData JSON object
        series_data_match = re.search(r'seriesData\s*=\s*(\{.+?\});', html, re.DOTALL)
        if series_data_match:
            try:
                data_str = series_data_match.group(1)
                data = json.loads(data_str)
                if 'episodes_count' in data and int(data['episodes_count']) > 0:
                    return int(data['episodes_count'])
                if 'episodes' in data and isinstance(data['episodes'], list) and len(data['episodes']) > 0:
                    return len(data['episodes'])
            except (json.JSONDecodeError, ValueError, TypeError):
                pass

        # Method 2: Look for pattern in description "XX ตอน"
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        if desc_tag:
            desc = desc_tag.get('content', '')
            match = re.search(r'(\d+)\s*ตอน', desc)
            if match:
                return int(match.group(1))

        # Method 3: Count episode links/buttons
        episode_matches = re.findall(r'ตอนที่\s*(\d+)', html)
        if episode_matches:
            return max(int(ep) for ep in episode_matches)

        # Default fallback
        return 1

    def get_episode_video_url(self, series_id: int, episode: int) -> Optional[EpisodeInfo]:
        """Get video URL for a specific episode"""

        # First try to get from cached series info
        series_info = self.get_series_info(series_id)
        if series_info and series_info.episode_urls and episode in series_info.episode_urls:
            return EpisodeInfo(
                episode_number=episode,
                title=f"ตอนที่ {episode}",
                video_url=series_info.episode_urls[episode]
            )

        # Method 1: Try dynamic playseries API endpoint
        try:
            api_url = f"{self.API_URL}?series_id={series_id}&ep={episode}"
            headers = {'Referer': f"{self.BASE_URL}?series_id={series_id}&ep={episode}"}
            response = self.session.get(api_url, headers=headers, timeout=30)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and data.get('ok') is True and isinstance(data.get('video_url'), str):
                        video_url = data['video_url']
                        video_url = video_url.replace('\\/', '/').replace('\\u0026', '&').replace('&amp;', '&')
                        if series_info:
                            if series_info.episode_urls is None:
                                series_info.episode_urls = {}
                            series_info.episode_urls[episode] = video_url
                        return EpisodeInfo(
                            episode_number=episode,
                            title=f"ตอนที่ {episode}",
                            video_url=video_url
                        )
                except (json.JSONDecodeError, ValueError):
                    pass
        except requests.RequestException as e:
            print(f"API request error for episode {episode}: {e}")

        # Method 2 (Fallback): fetch the specific episode page
        url = f"{self.BASE_URL}?series_id={series_id}&ep={episode}"

        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            html = response.text

            # Extract URLs from this page
            episode_urls = self._extract_all_episode_urls(html)

            if episode in episode_urls:
                video_url = episode_urls[episode]
                if series_info:
                    if series_info.episode_urls is None:
                        series_info.episode_urls = {}
                    series_info.episode_urls[episode] = video_url
                return EpisodeInfo(
                    episode_number=episode,
                    title=f"ตอนที่ {episode}",
                    video_url=video_url
                )

            # Try direct pattern match for this specific episode
            pattern = rf'https://cdn\.discordapp\.com/attachments/\d+/\d+/{episode}\.mp4\?[^"\'<>\s\\]+'
            match = re.search(pattern, html)

            if match:
                video_url = match.group(0)
                video_url = video_url.replace('\\u0026', '&')
                video_url = video_url.replace('&amp;', '&')

                if series_info:
                    if series_info.episode_urls is None:
                        series_info.episode_urls = {}
                    series_info.episode_urls[episode] = video_url

                return EpisodeInfo(
                    episode_number=episode,
                    title=f"ตอนที่ {episode}",
                    video_url=video_url
                )

            print(f"Could not find video URL for episode {episode}")
            return None

        except requests.RequestException as e:
            print(f"Error fetching episode {episode}: {e}")
            return None

    def get_all_episodes(self, series_id: int, episodes: list[int] = None) -> list[EpisodeInfo]:
        """Get video URLs for all or selected episodes"""
        series_info = self.get_series_info(series_id)
        if not series_info:
            return []

        if episodes is None:
            episodes = list(range(1, series_info.total_episodes + 1))

        results = []
        for ep in episodes:
            episode_info = self.get_episode_video_url(series_id, ep)
            if episode_info:
                results.append(episode_info)

        return results


# Test
if __name__ == "__main__":
    parser = RongyokParser()

    # Test with series 941
    print("Fetching series info...")
    series_info = parser.get_series_info(941)
    if series_info:
        print(f"Title: {series_info.title}")
        print(f"Total Episodes: {series_info.total_episodes}")
        print(f"Poster: {series_info.poster_url}")
        print(f"Cached URLs: {len(series_info.episode_urls) if series_info.episode_urls else 0}")

        # Get first episode (should be from cache now)
        ep1 = parser.get_episode_video_url(941, 1)
        if ep1:
            print(f"\nEpisode 1 URL: {ep1.video_url[:80]}...")

        # Test episode 15
        ep15 = parser.get_episode_video_url(941, 15)
        if ep15:
            print(f"Episode 15 URL: {ep15.video_url[:80]}...")
