use crate::types::{EpisodeInfo, SeriesInfo};
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, REFERER, USER_AGENT};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub const BASE_URL: &str = "https://rongyok.com/watch/";
pub const API_URL: &str = "https://rongyok.com/watch/playseries.php";
pub const DEFAULT_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

#[derive(Clone)]
pub struct RongyokParser {
    client: reqwest::Client,
    cached_series: Arc<RwLock<HashMap<u32, SeriesInfo>>>,
}

impl RongyokParser {
    pub fn new() -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(DEFAULT_UA));
        headers.insert(
            ACCEPT,
            HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"),
        );
        headers.insert(
            ACCEPT_LANGUAGE,
            HeaderValue::from_static("th,en-US;q=0.9,en;q=0.8"),
        );
        headers.insert(
            "Sec-Ch-Ua",
            HeaderValue::from_static("\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\""),
        );
        headers.insert("Sec-Ch-Ua-Mobile", HeaderValue::from_static("?0"));
        headers.insert("Sec-Ch-Ua-Platform", HeaderValue::from_static("\"Windows\""));
        headers.insert("Sec-Fetch-Dest", HeaderValue::from_static("document"));
        headers.insert("Sec-Fetch-Mode", HeaderValue::from_static("navigate"));
        headers.insert("Sec-Fetch-Site", HeaderValue::from_static("same-origin"));
        headers.insert("Sec-Fetch-User", HeaderValue::from_static("?1"));
        headers.insert("Upgrade-Insecure-Requests", HeaderValue::from_static("1"));
        headers.insert(REFERER, HeaderValue::from_static("https://rongyok.com/"));

        let client = reqwest::Client::builder()
            .cookie_store(true)
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            client,
            cached_series: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn parse_series_url(&self, url: &str) -> Option<u32> {
        let trimmed = url.trim();

        // Direct number input e.g. "8626"
        if let Ok(id) = trimmed.parse::<u32>() {
            return Some(id);
        }

        // Query param e.g. ?series_id=8626 or &series_id=8626
        let re_query = Regex::new(r"series_id=(\d+)").ok()?;
        if let Some(caps) = re_query.captures(trimmed) {
            if let Some(m) = caps.get(1) {
                if let Ok(id) = m.as_str().parse::<u32>() {
                    return Some(id);
                }
            }
        }

        // Path formats e.g. /series/8626 or /watch/8626
        let re_path = Regex::new(r"/(?:series|watch)/(\d+)(?:/|$)").ok()?;
        if let Some(caps) = re_path.captures(trimmed) {
            if let Some(m) = caps.get(1) {
                if let Ok(id) = m.as_str().parse::<u32>() {
                    return Some(id);
                }
            }
        }

        None
    }

    pub async fn get_series_info(&self, series_id: u32, force_refresh: bool) -> Result<SeriesInfo, String> {
        if !force_refresh {
            let cache = self.cached_series.read().await;
            if let Some(info) = cache.get(&series_id) {
                return Ok(info.clone());
            }
        }

        // Initialize session cookies if needed
        let _ = self.client.get("https://rongyok.com/").send().await;

        let url = format!("{}?series_id={}", BASE_URL, series_id);

        let response = self
            .client
            .get(&url)
            .header(REFERER, "https://rongyok.com/")
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Server returned HTTP {}", response.status()));
        }

        let html = response
            .text()
            .await
            .map_err(|e| format!("Failed to read HTML response: {}", e))?;

        // 1. Extract Title
        let og_title_re = Regex::new(r#"<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["'](.*?)["']"#).unwrap();
        let h1_re = Regex::new(r#"<h1[^>]*>(.*?)</h1>"#).unwrap();
        let title_re = Regex::new(r"(?i)<title>(.*?)</title>").unwrap();

        let raw_title = og_title_re
            .captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string())
            .or_else(|| {
                h1_re
                    .captures(&html)
                    .and_then(|c| c.get(1))
                    .map(|m| {
                        let tag_re = Regex::new(r"<[^>]+>").unwrap();
                        tag_re.replace_all(m.as_str(), "").trim().to_string()
                    })
            })
            .or_else(|| {
                title_re
                    .captures(&html)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str().trim().to_string())
            })
            .unwrap_or_else(|| format!("Series {}", series_id));

        // Clean title
        let clean_title_re = Regex::new(r"\s*-\s*ตอนที่\s*\d+.*$").unwrap();
        let mut title = clean_title_re.replace(&raw_title, "").to_string();
        title = title
            .replace("&amp;", "&")
            .replace("&#039;", "'")
            .replace("&#39;", "'")
            .replace("&quot;", "\"")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .trim()
            .to_string();

        // 2. Extract Poster URL
        let og_image_re = Regex::new(r#"<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["'](.*?)["']"#).unwrap();
        let json_jpg_re = Regex::new(r#""(?:jpg_url|poster_url)"\s*:\s*"([^"]+)""#).unwrap();
        let poster_img_re = Regex::new(r#"<img[^>]+(?:class|id)=["'][^"']*poster[^"']*["'][^>]+src=["'](.*?)["']"#).unwrap();

        let mut poster_url = json_jpg_re
            .captures(&html)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().replace(r"\/", "/"))
            .or_else(|| {
                og_image_re
                    .captures(&html)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str().to_string())
            })
            .or_else(|| {
                poster_img_re
                    .captures(&html)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str().to_string())
            });

        if let Some(ref p_url) = poster_url {
            if p_url.starts_with("//") {
                poster_url = Some(format!("https:{}", p_url));
            } else if p_url.starts_with('/') {
                poster_url = Some(format!("https://rongyok.com{}", p_url));
            } else if !p_url.starts_with("http") {
                poster_url = Some(format!("https://rongyok.com/{}", p_url));
            }
        }

        // 3. Extract inline episode URLs if any
        let mut episode_urls = self.extract_all_episode_urls(&html);

        // 4. Extract total episodes accurately
        let mut total_episodes = self.extract_total_episodes(&html);
        if !episode_urls.is_empty() && total_episodes < episode_urls.len() as u32 {
            total_episodes = episode_urls.len() as u32;
        }

        // 5. If no episodes found from main HTML, query playseries.php for ep 1 to test
        if total_episodes == 1 && episode_urls.is_empty() {
            if let Ok(ep1_info) = self.get_episode_video_url(series_id, 1).await {
                episode_urls.insert(1, ep1_info.video_url);
            }
        }

        let series_info = SeriesInfo {
            series_id,
            title,
            total_episodes,
            poster_url,
            episode_urls,
        };

        // Cache it
        let mut cache = self.cached_series.write().await;
        cache.insert(series_id, series_info.clone());

        Ok(series_info)
    }

    pub fn extract_all_episode_urls(&self, html: &str) -> HashMap<u32, String> {
        let mut episode_urls = HashMap::new();

        // Pattern 1: numeric filename (1.mp4, 2.mp4) or ep55.mp4
        if let Ok(re1) = Regex::new(r#"(?i)https?:(?://|\\/\\/)cdn\.discordapp\.com(?:\/|\\/)attachments(?:\/|\\/)\d+(?:\/|\\/)\d+(?:\/|\\/)(?:ep)?(\d+)\.mp4\?[^"'<>\s]+"#) {
            for caps in re1.captures_iter(html) {
                if let (Some(full), Some(ep)) = (caps.get(0), caps.get(1)) {
                    if let Ok(ep_num) = ep.as_str().parse::<u32>() {
                        let clean_url = full.as_str()
                            .replace(r"\/", "/")
                            .replace(r"\u0026", "&")
                            .replace("&amp;", "&");
                        episode_urls.insert(ep_num, clean_url);
                    }
                }
            }
        }

        // Pattern 2: Generic video_url in JSON
        if let Ok(re2) = Regex::new(r#""video_url"\s*:\s*"(https?:[^"]+\.mp4[^"]*)""#) {
            for caps in re2.captures_iter(html) {
                if let Some(m) = caps.get(1) {
                    let clean_url = m.as_str()
                        .replace(r"\/", "/")
                        .replace(r"\u0026", "&")
                        .replace("&amp;", "&");
                    if let Ok(re_num) = Regex::new(r#"(?i)[/\\](?:ep)?(\d+)\.mp4"#) {
                        if let Some(num_caps) = re_num.captures(&clean_url) {
                            if let Some(ep_str) = num_caps.get(1) {
                                if let Ok(ep_num) = ep_str.as_str().parse::<u32>() {
                                    episode_urls.insert(ep_num, clean_url);
                                }
                            }
                        }
                    }
                }
            }
        }

        episode_urls
    }

    pub fn extract_total_episodes(&self, html: &str) -> u32 {
        // Method 1: Direct JSON regex "episodes_count": 124
        if let Ok(re_count) = Regex::new(r#""episodes_count"\s*:\s*(\d+)"#) {
            if let Some(caps) = re_count.captures(html) {
                if let Some(m) = caps.get(1) {
                    if let Ok(count) = m.as_str().parse::<u32>() {
                        if count > 0 {
                            return count;
                        }
                    }
                }
            }
        }

        // Method 2: Scan all "episode_number": X in JSON
        if let Ok(re_ep_nums) = Regex::new(r#""episode_number"\s*:\s*(\d+)"#) {
            let mut max_ep = 0;
            for caps in re_ep_nums.captures_iter(html) {
                if let Some(m) = caps.get(1) {
                    if let Ok(ep) = m.as_str().parse::<u32>() {
                        if ep > max_ep {
                            max_ep = ep;
                        }
                    }
                }
            }
            if max_ep > 0 {
                return max_ep;
            }
        }

        // Method 3: Meta description or text: "124 ตอน"
        if let Ok(re_desc) = Regex::new(r#"(\d+)\s*ตอน"#) {
            if let Some(caps) = re_desc.captures(html) {
                if let Some(m) = caps.get(1) {
                    if let Ok(count) = m.as_str().parse::<u32>() {
                        if count > 0 {
                            return count;
                        }
                    }
                }
            }
        }

        // Method 4: Full JSON parser on seriesData
        if let Ok(re_series_data) = Regex::new(r"(?s)seriesData\s*=\s*(\{.+?\});") {
            if let Some(caps) = re_series_data.captures(html) {
                if let Some(json_str) = caps.get(1) {
                    if let Ok(val) = serde_json::from_str::<Value>(json_str.as_str()) {
                        if let Some(count) = val.get("episodes_count").and_then(|v| v.as_u64()) {
                            if count > 0 {
                                return count as u32;
                            }
                        }
                        if let Some(episodes) = val.get("episodes").and_then(|v| v.as_array()) {
                            if !episodes.is_empty() {
                                return episodes.len() as u32;
                            }
                        }
                    }
                }
            }
        }

        1
    }

    pub async fn get_episode_video_url(&self, series_id: u32, episode: u32) -> Result<EpisodeInfo, String> {
        // 1. Check cache first
        {
            let cache = self.cached_series.read().await;
            if let Some(series) = cache.get(&series_id) {
                if let Some(url) = series.episode_urls.get(&episode) {
                    return Ok(EpisodeInfo {
                        episode_number: episode,
                        title: format!("ตอนที่ {}", episode),
                        video_url: url.clone(),
                    });
                }
            }
        }

        // 2. Call dynamic playseries.php API with browser AJAX headers
        let api_url = format!("{}?series_id={}&ep={}", API_URL, series_id, episode);
        let referer_url = format!("{}?series_id={}&ep={}", BASE_URL, series_id, episode);

        if let Ok(resp) = self
            .client
            .get(&api_url)
            .header(REFERER, &referer_url)
            .header(ACCEPT, "application/json, text/javascript, */*; q=0.01")
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Sec-Fetch-Dest", "empty")
            .header("Sec-Fetch-Mode", "cors")
            .header("Sec-Fetch-Site", "same-origin")
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(val) = resp.json::<Value>().await {
                    if val.get("ok").and_then(|v| v.as_bool()) == Some(true) {
                        if let Some(raw_url) = val.get("video_url").and_then(|v| v.as_str()) {
                            let clean_url = raw_url
                                .replace(r"\/", "/")
                                .replace(r"\u0026", "&")
                                .replace("&amp;", "&");

                            // Cache it
                            let mut cache = self.cached_series.write().await;
                            if let Some(series) = cache.get_mut(&series_id) {
                                series.episode_urls.insert(episode, clean_url.clone());
                            }

                            return Ok(EpisodeInfo {
                                episode_number: episode,
                                title: format!("ตอนที่ {}", episode),
                                video_url: clean_url,
                            });
                        }
                    }
                }
            }
        }

        // 3. Fallback: fetch episode HTML page
        let page_url = format!("{}?series_id={}&ep={}", BASE_URL, series_id, episode);
        let resp = self
            .client
            .get(&page_url)
            .header(REFERER, &referer_url)
            .send()
            .await
            .map_err(|e| format!("Fallback page request failed: {}", e))?;

        let html = resp
            .text()
            .await
            .map_err(|e| format!("Failed to read episode HTML: {}", e))?;

        let extracted = self.extract_all_episode_urls(&html);
        if let Some(url) = extracted.get(&episode) {
            let mut cache = self.cached_series.write().await;
            if let Some(series) = cache.get_mut(&series_id) {
                series.episode_urls.insert(episode, url.clone());
            }

            return Ok(EpisodeInfo {
                episode_number: episode,
                title: format!("ตอนที่ {}", episode),
                video_url: url.clone(),
            });
        }

        Err(format!("Could not find video URL for episode {}", episode))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_total_episodes_series_7910() {
        let parser = RongyokParser::new();
        let html_7910 = r#"
            <script>
            const seriesData = {"id":7910,"title":"สงครามรักซาตาน","episodes_count":45,"episodes":[{"id":1,"episode_number":1},{"id":45,"episode_number":45}]};
            </script>
            <meta name="description" content="ดูสงครามรักซาตาน พากย์ไทย หนังสั้นจีน ฟรี คุณภาพ HD 45 ตอน จบ">
        "#;
        assert_eq!(parser.extract_total_episodes(html_7910), 45);
    }

    #[test]
    fn test_extract_total_episodes_series_8626() {
        let parser = RongyokParser::new();
        let html_8626 = r#"
            const seriesData = {"id":8626,"title":"สายลับจับคู่รักซีซั่น8","episodes_count":124};
        "#;
        assert_eq!(parser.extract_total_episodes(html_8626), 124);
    }

    #[test]
    fn test_extract_total_episodes_meta_desc() {
        let parser = RongyokParser::new();
        let html = r#"<meta name="description" content="ดูซีรีส์ 90 ตอนจบ">"#;
        assert_eq!(parser.extract_total_episodes(html), 90);
    }

    #[test]
    fn test_parse_series_url_formats() {
        let parser = RongyokParser::new();
        assert_eq!(parser.parse_series_url("https://rongyok.com/watch/?series_id=7910&ep=1"), Some(7910));
        assert_eq!(parser.parse_series_url("https://rongyok.com/series/7910/สงครามรักซาตาน"), Some(7910));
        assert_eq!(parser.parse_series_url("https://rongyok.com/series/7910/%E0%B8%AA%E0%B8%87..."), Some(7910));
        assert_eq!(parser.parse_series_url("https://rongyok.com/series/8625/"), Some(8625));
        assert_eq!(parser.parse_series_url("https://rongyok.com/watch/941"), Some(941));
        assert_eq!(parser.parse_series_url("100999963"), Some(100999963));
        assert_eq!(parser.parse_series_url("?ref=share&series_id=8626&ep=55"), Some(8626));
    }
}


