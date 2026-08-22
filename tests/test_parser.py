"""
Unit Tests for Rongyok Parser
Tests URL parsing, episode extraction, and data structures
"""

import pytest
import re
from unittest.mock import Mock, patch, MagicMock
from bs4 import BeautifulSoup

# Import the module under test
from parser import RongyokParser, SeriesInfo, EpisodeInfo


class TestSeriesInfo:
    """Tests for SeriesInfo dataclass"""

    def test_series_info_creation(self):
        """Test basic SeriesInfo creation"""
        info = SeriesInfo(
            series_id=941,
            title="Test Series",
            total_episodes=30
        )
        assert info.series_id == 941
        assert info.title == "Test Series"
        assert info.total_episodes == 30
        assert info.poster_url is None
        assert info.episode_urls is None

    def test_series_info_with_all_fields(self):
        """Test SeriesInfo with all optional fields"""
        episode_urls = {1: "http://example.com/1.mp4", 2: "http://example.com/2.mp4"}
        info = SeriesInfo(
            series_id=941,
            title="Test Series",
            total_episodes=30,
            poster_url="http://example.com/poster.jpg",
            episode_urls=episode_urls
        )
        assert info.poster_url == "http://example.com/poster.jpg"
        assert info.episode_urls == episode_urls
        assert len(info.episode_urls) == 2


class TestEpisodeInfo:
    """Tests for EpisodeInfo dataclass"""

    def test_episode_info_creation(self):
        """Test basic EpisodeInfo creation"""
        info = EpisodeInfo(
            episode_number=1,
            title="ตอนที่ 1",
            video_url="http://example.com/1.mp4"
        )
        assert info.episode_number == 1
        assert info.title == "ตอนที่ 1"
        assert info.video_url == "http://example.com/1.mp4"


class TestParseSeriesUrl:
    """Tests for parse_series_url method"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    def test_parse_query_param_format(self, parser):
        """Test parsing ?series_id=XXX format"""
        url = "https://rongyok.com/watch/?series_id=941"
        assert parser.parse_series_url(url) == 941

    def test_parse_query_param_with_episode(self, parser):
        """Test parsing URL with series_id and episode"""
        url = "https://rongyok.com/watch/?series_id=941&ep=5"
        assert parser.parse_series_url(url) == 941

    def test_parse_path_format(self, parser):
        """Test parsing /series/XXX/ format"""
        url = "https://rongyok.com/series/941/some-title-here"
        assert parser.parse_series_url(url) == 941

    def test_parse_path_format_no_trailing(self, parser):
        """Test parsing /series/XXX format without trailing slash"""
        url = "https://rongyok.com/series/941"
        assert parser.parse_series_url(url) == 941

    def test_parse_url_encoded_thai(self, parser):
        """Test parsing URL with Thai characters (URL encoded)"""
        url = "https://rongyok.com/series/1038/%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%99%E0%B8%B5%E0%B9%89"
        assert parser.parse_series_url(url) == 1038

    def test_parse_invalid_url(self, parser):
        """Test parsing invalid URL returns None"""
        url = "https://rongyok.com/about"
        assert parser.parse_series_url(url) is None

    def test_parse_empty_url(self, parser):
        """Test parsing empty URL returns None"""
        assert parser.parse_series_url("") is None

    def test_parse_different_series_ids(self, parser):
        """Test parsing various series IDs"""
        test_cases = [
            ("https://rongyok.com/watch/?series_id=1", 1),
            ("https://rongyok.com/watch/?series_id=999", 999),
            ("https://rongyok.com/watch/?series_id=12345", 12345),
            ("https://rongyok.com/series/100/title", 100),
        ]
        for url, expected in test_cases:
            assert parser.parse_series_url(url) == expected


class TestExtractAllEpisodeUrls:
    """Tests for _extract_all_episode_urls method"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    def test_extract_numeric_filename_urls(self, parser):
        """Test extracting URLs with numeric filenames (1.mp4, 2.mp4)"""
        html = '''
        seriesData = {
            episodes: [
                {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/123\\/456\\/1.mp4?token=abc"},
                {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/123\\/456\\/2.mp4?token=def"}
            ]
        }
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 1 in urls
        assert 2 in urls
        assert "cdn.discordapp.com" in urls[1]
        assert "cdn.discordapp.com" in urls[2]

    def test_extract_ep_prefix_urls(self, parser):
        """Test extracting URLs with EP prefix (EP01.mp4, EP02.mp4)"""
        html = '''
        seriesData = {
            episodes: [
                {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/123\\/456\\/EP01.mp4?token=abc"},
                {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/123\\/456\\/EP02.mp4?token=def"}
            ]
        }
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 1 in urls
        assert 2 in urls

    def test_extract_unescaped_urls(self, parser):
        """Test extracting unescaped URLs"""
        html = '''
        <script>
        var videoUrl = "https://cdn.discordapp.com/attachments/123/456/5.mp4?ex=abc&is=def";
        </script>
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 5 in urls
        assert "\\/" not in urls[5]  # Should be unescaped

    def test_extract_unicode_escaped_ampersand(self, parser):
        """Test handling \\u0026 escape sequences"""
        html = '''
        {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/123\\/456\\/3.mp4?ex=abc\\u0026is=def"}
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 3 in urls
        assert "\\u0026" not in urls[3]
        assert "&" in urls[3]

    def test_extract_html_encoded_ampersand(self, parser):
        """Test handling &amp; HTML entities"""
        html = '''
        {"video_url": "https://cdn.discordapp.com/attachments/123/456/4.mp4?ex=abc&amp;is=def"}
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 4 in urls
        assert "&amp;" not in urls[4]

    def test_extract_empty_html(self, parser):
        """Test extracting from empty HTML returns empty dict"""
        urls = parser._extract_all_episode_urls("")
        assert urls == {}

    def test_extract_no_video_urls(self, parser):
        """Test extracting from HTML without video URLs"""
        html = "<html><body><h1>No videos here</h1></body></html>"
        urls = parser._extract_all_episode_urls(html)
        assert urls == {}

    def test_extract_mixed_formats(self, parser):
        """Test extracting mixed URL formats"""
        html = '''
        {"episodes": [
            {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/100\\/200\\/1.mp4?token=a"},
            {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/100\\/200\\/EP02.mp4?token=b"},
            {"video_url": "https:\\/\\/cdn.discordapp.com\\/attachments\\/100\\/200\\/3.mp4?token=c"}
        ]}
        '''
        urls = parser._extract_all_episode_urls(html)
        assert 1 in urls
        assert 2 in urls
        assert 3 in urls


class TestExtractTotalEpisodes:
    """Tests for _extract_total_episodes method"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    def test_extract_from_meta_description(self, parser):
        """Test extracting episode count from meta description"""
        html = '<meta name="description" content="ซีรีส์ดัง 30 ตอน HD">'
        soup = BeautifulSoup(html, 'html.parser')
        count = parser._extract_total_episodes(soup, html)
        assert count == 30

    def test_extract_from_episode_text(self, parser):
        """Test extracting episode count from ตอนที่ X pattern"""
        html = '''
        <div>ตอนที่ 1</div>
        <div>ตอนที่ 15</div>
        <div>ตอนที่ 20</div>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        count = parser._extract_total_episodes(soup, html)
        assert count == 20  # Should return max

    def test_extract_fallback_default(self, parser):
        """Test fallback to 1 when no episodes found"""
        html = '<html><body>No episode info</body></html>'
        soup = BeautifulSoup(html, 'html.parser')
        count = parser._extract_total_episodes(soup, html)
        assert count == 1

    def test_extract_various_episode_counts(self, parser):
        """Test various episode count patterns"""
        test_cases = [
            ('<meta name="description" content="10 ตอน">', 10),
            ('<meta name="description" content="จบ 50 ตอน">', 50),
            ('<meta name="description" content="มี 100 ตอน HD">', 100),
        ]
        for html, expected in test_cases:
            soup = BeautifulSoup(html, 'html.parser')
            count = parser._extract_total_episodes(soup, html)
            assert count == expected

    def test_extract_from_seriesdata_json(self, parser):
        """Test extracting episode count from seriesData JSON object"""
        html = '''
        <script>
        const seriesData = {"id":8625,"title":"Test","episodes_count":77,"episodes":[{"id":1},{"id":2}]};
        </script>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        count = parser._extract_total_episodes(soup, html)
        assert count == 77


class TestGetSeriesInfo:
    """Tests for get_series_info method with mocked requests"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    @patch.object(RongyokParser, '_extract_all_episode_urls')
    @patch('requests.Session.get')
    def test_get_series_info_success(self, mock_get, mock_extract, parser):
        """Test successful series info retrieval"""
        # Mock response
        mock_response = Mock()
        mock_response.text = '''
        <html>
        <head>
            <title>Test Series - ตอนที่ 1</title>
            <meta property="og:image" content="http://example.com/poster.jpg">
            <meta name="description" content="30 ตอน">
        </head>
        </html>
        '''
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Mock episode URLs extraction
        mock_extract.return_value = {1: "url1", 2: "url2", 3: "url3"}

        info = parser.get_series_info(941)

        assert info is not None
        assert info.series_id == 941
        assert info.title == "Test Series"
        assert info.poster_url == "http://example.com/poster.jpg"

    @patch('requests.Session.get')
    def test_get_series_info_cached(self, mock_get, parser):
        """Test series info caching"""
        # Pre-populate cache
        cached_info = SeriesInfo(
            series_id=941,
            title="Cached Series",
            total_episodes=10
        )
        parser._cached_series[941] = cached_info

        # Should return cached without making request
        info = parser.get_series_info(941)

        assert info == cached_info
        mock_get.assert_not_called()

    @patch('requests.Session.get')
    def test_get_series_info_force_refresh(self, mock_get, parser):
        """Test force refresh bypasses cache"""
        # Pre-populate cache
        parser._cached_series[941] = SeriesInfo(
            series_id=941,
            title="Old",
            total_episodes=5
        )

        # Mock new response
        mock_response = Mock()
        mock_response.text = '<html><head><title>New Title</title></head></html>'
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        info = parser.get_series_info(941, force_refresh=True)

        mock_get.assert_called_once()
        assert info.title == "New Title"

    @patch('requests.Session.get')
    def test_get_series_info_network_error(self, mock_get, parser):
        """Test handling network errors"""
        import requests
        mock_get.side_effect = requests.RequestException("Network error")

        info = parser.get_series_info(941)

        assert info is None


class TestGetEpisodeVideoUrl:
    """Tests for get_episode_video_url method"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    def test_get_episode_from_cache(self, parser):
        """Test getting episode URL from cached series info"""
        # Pre-populate cache with episode URLs
        parser._cached_series[941] = SeriesInfo(
            series_id=941,
            title="Test",
            total_episodes=10,
            episode_urls={
                1: "http://example.com/1.mp4",
                2: "http://example.com/2.mp4"
            }
        )

        episode = parser.get_episode_video_url(941, 1)

        assert episode is not None
        assert episode.episode_number == 1
        assert episode.video_url == "http://example.com/1.mp4"

    @patch('requests.Session.get')
    def test_get_episode_from_playseries_api(self, mock_get, parser):
        """Test getting episode URL from playseries API"""
        parser._cached_series[8625] = SeriesInfo(
            series_id=8625,
            title="Test Dynamic",
            total_episodes=77,
            episode_urls={}
        )

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "ok": True,
            "video_url": "https://cdn.discordapp.com/attachments/123/456/ep60.mp4?token=abc"
        }
        mock_get.return_value = mock_response

        episode = parser.get_episode_video_url(8625, 60)

        assert episode is not None
        assert episode.episode_number == 60
        assert episode.video_url == "https://cdn.discordapp.com/attachments/123/456/ep60.mp4?token=abc"
        # Verify it cached the URL
        assert parser._cached_series[8625].episode_urls[60] == episode.video_url

    @patch('requests.Session.get')
    def test_get_episode_fallback_fetch(self, mock_get, parser):
        """Test fallback to fetching specific episode page"""
        # Empty cache
        parser._cached_series[941] = SeriesInfo(
            series_id=941,
            title="Test",
            total_episodes=10,
            episode_urls={}  # No cached URLs
        )

        # Mock response for episode page
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.text = '''
        {"video_url": "https://cdn.discordapp.com/attachments/123/456/5.mp4?token=abc"}
        '''
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        episode = parser.get_episode_video_url(941, 5)

        assert episode is not None
        assert episode.episode_number == 5


class TestGetAllEpisodes:
    """Tests for get_all_episodes method"""

    @pytest.fixture
    def parser(self):
        """Create parser instance"""
        return RongyokParser()

    def test_get_all_episodes_from_cache(self, parser):
        """Test getting all episodes from cache"""
        parser._cached_series[941] = SeriesInfo(
            series_id=941,
            title="Test",
            total_episodes=3,
            episode_urls={
                1: "http://example.com/1.mp4",
                2: "http://example.com/2.mp4",
                3: "http://example.com/3.mp4"
            }
        )

        episodes = parser.get_all_episodes(941)

        assert len(episodes) == 3
        assert episodes[0].episode_number == 1
        assert episodes[1].episode_number == 2
        assert episodes[2].episode_number == 3

    def test_get_selected_episodes(self, parser):
        """Test getting selected episodes only"""
        parser._cached_series[941] = SeriesInfo(
            series_id=941,
            title="Test",
            total_episodes=10,
            episode_urls={i: f"http://example.com/{i}.mp4" for i in range(1, 11)}
        )

        episodes = parser.get_all_episodes(941, episodes=[1, 5, 10])

        assert len(episodes) == 3
        assert episodes[0].episode_number == 1
        assert episodes[1].episode_number == 5
        assert episodes[2].episode_number == 10

    @patch.object(RongyokParser, 'get_series_info')
    def test_get_all_episodes_no_series(self, mock_get_series, parser):
        """Test returns empty list when series not found"""
        mock_get_series.return_value = None

        episodes = parser.get_all_episodes(999)

        assert episodes == []


class TestParserInitialization:
    """Tests for parser initialization"""

    def test_parser_has_session(self):
        """Test parser initializes with session"""
        parser = RongyokParser()
        assert parser.session is not None

    def test_parser_has_user_agent(self):
        """Test parser has User-Agent header"""
        parser = RongyokParser()
        assert 'User-Agent' in parser.session.headers
        assert 'Mozilla' in parser.session.headers['User-Agent']

    def test_parser_has_referer(self):
        """Test parser has Referer header"""
        parser = RongyokParser()
        assert 'Referer' in parser.session.headers
        assert 'rongyok.com' in parser.session.headers['Referer']

    def test_parser_empty_cache(self):
        """Test parser starts with empty cache"""
        parser = RongyokParser()
        assert parser._cached_series == {}

    def test_parser_base_url(self):
        """Test parser has correct base URL"""
        assert RongyokParser.BASE_URL == "https://rongyok.com/watch/"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
