# 🎬 Rongyok Video Downloader HUD (v2.0 Rust Edition)

> ⚡ **High-Performance Stream Downloader, Dynamic Stream Extractor & Video Concat Engine for Rongyok.com**  
> Re-architected with **Rust (Tauri v2)** and **React 19 (Cyber HUD Interface)** with full backward-compatible Python CLI utilities.

[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8D8?logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Acknowledgement & Attribution

This project is a refactored and enhanced fork based on the original work by **[TheerasakPing/rongyok-video-downloader](https://github.com/TheerasakPing/rongyok-video-downloader.git)**.

Special thanks to [TheerasakPing](https://github.com/TheerasakPing) for the original foundation, reverse engineering of video stream patterns, and core architecture concepts.

---

## ⚡ What's New in v2.0 (Rust HUD Edition)

- 🦀 **Rust Core Engine (`src-tauri`):**
  - **Dynamic Stream Extractor:** Automatically handles `/watch/playseries.php` API with active session cookie preservation and dynamic signature token negotiation.
  - **Tokio Multi-threaded Downloader:** Blazing fast concurrent downloads with HTTP 206 `Range` byte resumption and `.mp4.part` staging.
  - **FFmpeg Concat Demuxer:** Lossless instant stream merging (`-c copy`) with automatic Windows path escaping and part file cleanup.
  - **Session State Persistence:** Atomic state preservation (`download_state.json`) with 1-click session recovery.
- 🖥️ **Futuristic Cyber HUD Interface:**
  - **React Bits Design:** Sleek dark glassmorphism, scanlines, glowing cyber neon borders, and smooth telemetry transitions.
  - **Strict Vector SVG Policy:** 100% vector SVG icons via `lucide-react` across all status badges, telemetry bars, and interactive logs.
  - **Episode Matrix:** Interactive multi-select grid with range selection (e.g. `1-20`), select/deselect all, and batch indicators.
  - **Telemetry Console:** Live speed gauge (MB/s), ETA countdown, dual episode/batch progress bars, and searchable log stream.
  - **Dual Mode Support:** Runs seamlessly both as a native Windows desktop app (`npm run tauri dev`) and as an interactive web app (`npm run dev`).

---

## 🛠️ System Architecture & Tech Stack

```
📦 rongyok-video-downloader/
├── 🦀 src-tauri/             # Rust Native Backend (Tauri v2)
│   ├── src/
│   │   ├── parser.rs         # Dynamic stream resolver & cookie-jar HTTP client
│   │   ├── downloader.rs     # Async chunked Range downloader & telemetry emitter
│   │   ├── merger.rs         # Lossless FFmpeg concat engine
│   │   ├── state.rs          # Atomic session JSON serialization
│   │   ├── commands.rs       # Tauri IPC command handlers
│   │   └── main.rs / lib.rs  # Tauri application entry point
│   ├── Cargo.toml            # Rust dependencies & optimization profiles
│   └── tauri.conf.json       # Window configuration & desktop permissions
│
├── ⚛️ src/                    # Frontend UI (React + TypeScript + Vite)
│   ├── components/
│   │   ├── HUDHeader.tsx     # System brand & live diagnostic indicators
│   │   ├── URLBar.tsx        # Target URL input with Paste, Fetch & sample preset
│   │   ├── OutputSelector.tsx# Output storage path selector
│   │   ├── SeriesCard.tsx    # Poster preview & series metadata
│   │   ├── EpisodeGrid.tsx   # Interactive episode selection matrix
│   │   ├── ProgressConsole.tsx # Speed meter, ETA timer & progress bars
│   │   ├── ActionControls.tsx# Download, Pause, Resume, Cancel & Merge switches
│   │   ├── TelemetryLog.tsx  # Searchable HUD terminal log stream
│   │   ├── SpotlightCard.tsx # React Bits spotlight glassmorphism container
│   │   └── HUDBackground.tsx # Cyberpunk grid backdrop & scanlines
│   ├── utils/tauri.ts        # Universal Tauri IPC bridge with browser simulation fallback
│   ├── types/index.ts        # TypeScript data contracts
│   └── App.tsx               # Main application state machine
│
├── 🐍 Legacy Python Modules/ # Maintained Python CLI & Scraper
│   ├── cli.py                # Command-line interface
│   ├── gui.py                # Legacy Tkinter desktop interface
│   ├── parser.py             # Python scraper with dynamic playseries.php resolver
│   ├── downloader.py         # Python Range downloader
│   └── merger.py             # Python FFmpeg subprocess wrapper
└── 🧪 tests/                 # Unit & regression test suite (82 passing tests)
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher) & `npm`
- [Rust](https://www.rust-lang.org/tools/install) (`rustc` and `cargo` 1.75+)
- [FFmpeg](https://ffmpeg.org/download.html) (Optional, required for automatic video merging)

### 1. Clone the Repository
```bash
git clone https://github.com/bearnannan/rongyok-video-downloader.git
cd rongyok-video-downloader
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Run Desktop Application (Tauri Mode)
```bash
npm run tauri dev
```

### 4. Or Run Standalone Web Interface (Browser Mode)
```bash
npm run dev
```
Open **[http://localhost:1420](http://localhost:1420)** in your browser.

---

## 📦 Building Production Release

To build a standalone optimized `.exe` and Windows Installer:
```bash
npm run tauri build
```
The compiled binaries will be located in the release bundle directory:
- **Standalone `.exe`**: `src-tauri/target/release/rongyok-video-downloader.exe`
- **Installer Package**: `src-tauri/target/release/bundle/nsis/` or `msi/`

---

## 🐍 Legacy Python CLI Usage

If you prefer using the Python CLI:
```bash
# Setup virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Download all episodes
python cli.py https://rongyok.com/watch/?series_id=8625

# Download specific episode range
python cli.py https://rongyok.com/watch/?series_id=8625 --episodes 1-10

# Resume interrupted download
python cli.py https://rongyok.com/watch/?series_id=8625 --resume
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Crafted with ⚡ and 🦀 for high-performance automation.
</p>
