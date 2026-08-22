import sys
import json
import re
import html as html_parser
import requests

def scrape(series_id):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "th,en-US;q=0.9,en;q=0.8",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://rongyok.com/",
    }

    session = requests.Session()
    # 1. Handshake for cookies
    try:
        session.get("https://rongyok.com/", headers=headers, timeout=10)
    except Exception:
        pass

    # 2. Fetch series page
    url = f"https://rongyok.com/watch/?series_id={series_id}"
    resp = session.get(url, headers=headers, timeout=15)
    if resp.status_code != 200:
        return {"error": f"HTTP {resp.status_code}", "series_id": series_id}

    # 3. Decode content safely across UTF-8, TIS-620 / CP874
    html_content = ""
    try:
        html_content = resp.content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            html_content = resp.content.decode("cp874")
        except UnicodeDecodeError:
            try:
                html_content = resp.content.decode("tis-620")
            except UnicodeDecodeError:
                html_content = resp.content.decode("utf-8", errors="replace")

    # Extract title
    og_title = re.search(r'<meta\s+(?:property|name)=["\'](?:og:title|twitter:title)["\']\s+content=["\'](.*?)["\']', html_content)
    h1_title = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.DOTALL)
    json_title = re.search(r'"title"\s*:\s*"([^"]+)"', html_content)
    doc_title = re.search(r'<title>(.*?)</title>', html_content)

    raw_title = ""
    if og_title and og_title.group(1).strip():
        raw_title = og_title.group(1).strip()
    elif h1_title and h1_title.group(1).strip():
        raw_title = re.sub(r'<[^>]+>', '', h1_title.group(1)).strip()
    elif json_title and json_title.group(1).strip():
        raw_title = json_title.group(1).strip()
    elif doc_title and doc_title.group(1).strip():
        raw_title = doc_title.group(1).strip()
    else:
        raw_title = f"Series {series_id}"

    clean_title = re.sub(r'\s*-\s*ตอนที่\s*\d+.*$', '', raw_title).strip()
    clean_title = html_parser.unescape(clean_title)

    # Extract poster
    json_poster = re.search(r'"(?:jpg_url|poster_url)"\s*:\s*"([^"]+)"', html_content)
    og_image = re.search(r'<meta\s+(?:property|name)=["\'](?:og:image|twitter:image)["\']\s+content=["\'](.*?)["\']', html_content)
    poster = None
    if json_poster:
        poster = json_poster.group(1).replace(r"\/", "/")
    elif og_image:
        poster = og_image.group(1)

    if poster:
        if poster.startswith("//"):
            poster = "https:" + poster
        elif poster.startswith("/"):
            poster = "https://rongyok.com" + poster
        elif not poster.startswith("http"):
            poster = "https://rongyok.com/" + poster

    # Extract total episodes
    ep_count = None
    m_count = re.search(r'"episodes_count"\s*:\s*(\d+)', html_content)
    if m_count:
        ep_count = int(m_count.group(1))

    if not ep_count:
        ep_nums = [int(x) for x in re.findall(r'"episode_number"\s*:\s*(\d+)', html_content)]
        if ep_nums:
            ep_count = max(ep_nums)

    if not ep_count:
        desc_m = re.search(r'(\d+)\s*ตอน', html_content)
        if desc_m:
            ep_count = int(desc_m.group(1))

    if not ep_count:
        ep_count = 1

    return {
        "series_id": series_id,
        "title": clean_title,
        "total_episodes": ep_count,
        "poster_url": poster or f"https://rongyok.com/images/poster/series-{series_id}.jpg",
    }

if __name__ == "__main__":
    sid = int(sys.argv[1]) if len(sys.argv) > 1 else 8608
    res = scrape(sid)
    # Output pure UTF-8 bytes to binary stdout buffer
    json_bytes = json.dumps(res, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(json_bytes)
