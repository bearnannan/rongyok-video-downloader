# Rongyok Video Downloader HUD (v2.0 Rust Edition)

> **เครื่องมือดาวน์โหลดวิดีโอและรวมไฟล์ซีรีส์จาก rongyok.com ประสิทธิภาพสูง**  
> ปรับปรุงสถาปัตยกรรมใหม่ด้วย **Rust (Tauri v2)** และ **React 19 Cyber HUD Interface** พร้อมระบบ Dynamic Stream Resolver และยังคงรองรับการใช้งานผ่าน Python CLI แบบสมบูรณ์

[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24C8D8?logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## การให้เครดิตและที่มาของโครงการ (Acknowledgement & Credits)

โครงการนี้ได้รับการพัฒนาต่อยอด ปรับปรุงสถาปัตยกรรม (Refactored & Enhanced) จากผลงานต้นฉบับของ **[TheerasakPing/rongyok-video-downloader](https://github.com/TheerasakPing/rongyok-video-downloader.git)**

ขอขอบคุณ [TheerasakPing](https://github.com/TheerasakPing) เป็นอย่างยิ่งสำหรับรากฐานของโปรเจกต์ การ Reverse Engineering โครงสร้างสตรีมวิดีโอ และแนวคิดระบบการดาวน์โหลดต้นแบบ

---

## คุณสมบัติและความสามารถเด่น (Key Features)

### 1. Rust High-Performance Core Engine (`src-tauri`)
- **Dynamic Stream Extraction:** แก้ปัญหาลิงก์วิดีโอไม่โหลดในซีรีส์รุ่นใหม่ ด้วยการเชื่อมต่อ endpoint `/watch/playseries.php` พร้อมรักษา Session Cookie และส่ง Header ลายเซ็นอัตโนมัติ (พร้อมระบบ Regex Fallback)
- **Tokio Multi-threaded Downloader:** เอนจินดาวน์โหลดแบบ Asynchronous ความเร็วสูง ใช้หน่วยความจำต่ำมาก
- **HTTP Range Resume Support:** ดาวน์โหลดต่อจากไฟล์ชั่วคราว `.mp4.part` ได้ทันทีหากเน็ตหลุดหรือถูกขัดจังหวะ โดยไม่ต้องเริ่มโหลดใหม่ตั้งแต่ 0%
- **Lossless FFmpeg Concat Demuxer:** รวมไฟล์วิดีโอทุกตอนเป็นไฟล์เดียว (`.mp4`) ด้วยโหมด Stream Copy (`-c copy`) แบบไม่สูญเสียความละเอียดและใช้เวลาเพียงไม่กี่วินาที
- **Atomic State Persistence:** บันทึกสถานะการดาวน์โหลดลงไฟล์ `download_state.json` รองรับการกู้คืนเซสชันเดิม (Resume Previous Session) ด้วยคลิกเดียว

### 2. Futuristic Cyber HUD Interface (React 19 + React Bits)
- **Sleek Cyberpunk Aesthetic:** ดีไซน์โทน Dark Mode สไตล์ Sci-Fi HUD พร้อมพื้นหลังตาราง Grid, เส้น Scanlines เรืองแสง และการ์ดแบบ Glassmorphism
- **Strict Vector SVG Policy:** ใช้งาน Vector SVG Icons ผ่าน `lucide-react` 100% ทั่วทั้งระบบ โดยไม่มีการใช้ Raw Emojis
- **Interactive Episode Matrix:** ตารางเลือกตอนแบบ Grid พร้อมปุ่มเลือกช่วง (Range Selector เช่น `1-20`), ปุ่ม Select All, Deselect All และตัวบอกสถานะรายตอน
- **Real-time Telemetry Dashboard:** มาตรวัดความเร็วแบบเรียลไทม์ (MB/s), ระบบคำนวณเวลาคงเหลือ (ETA), แถบ Progress Bar คู่ (รายตอนและทั้งชุด)
- **Searchable Telemetry Log:** หน้าต่าง Terminal Log แสดงเหตุการณ์แบบเรียลไทม์ พร้อมช่องค้นหา/กรองข้อความ ปุ่ม Copy Log และปุ่ม Clear Log
- **Dual Runtime Support:** รองรับการทำงานทั้งแบบ Native Desktop App (Tauri) และแบบ Standalone Web Browser Simulation

---

## โครงสร้างสถาปัตยกรรมและเทคโนโลยี (Tech Stack)

```
rongyok-video-downloader/
├── src-tauri/             # ฝั่ง Backend ภาษา Rust (Tauri v2)
│   ├── src/
│   │   ├── parser.rs         # ตัวแกะ URL และเชื่อมต่อ dynamic playseries.php API
│   │   ├── downloader.rs     # เอนจินดาวน์โหลด Async Multi-thread พร้อม HTTP Range
│   │   ├── merger.rs         # ตัวเชื่อมต่อ FFmpeg Concat Demuxer
│   │   ├── state.rs          # จัดเก็บและโหลดสถานะเซสชัน JSON
│   │   ├── commands.rs       # Tauri IPC Command Handlers
│   │   └── main.rs / lib.rs  # จุดเริ่มต้นการทำงานของแอปพลิเคชัน Desktop
│   ├── Cargo.toml            # รายการ Dependencies และการตั้งค่า Build Profile ของ Rust
│   └── tauri.conf.json       # การตั้งค่าหน้าต่างและ Permission ของ Tauri
│
├── src/                    # ฝั่ง Frontend UI (React 19 + TypeScript + Vite)
│   ├── components/
│   │   ├── HUDHeader.tsx     # แถบหัวระบบ แสดงสถานะ IPC, Engine และ FFmpeg
│   │   ├── URLBar.tsx        # ช่องใส่ URL พร้อมปุ่ม Paste, Fetch และ Sample Preset
│   │   ├── OutputSelector.tsx# กล่องเลือกโฟลเดอร์สำหรับจัดเก็บไฟล์วิดีโอ
│   │   ├── SeriesCard.tsx    # แสดงโปสเตอร์และข้อมูลซีรีส์
│   │   ├── EpisodeGrid.tsx   # ตารางเลือกตอน Interactive พร้อม Range Selector
│   │   ├── ProgressConsole.tsx # แผงแสดงความเร็ว (MB/s), ETA และ Progress Bars
│   │   ├── ActionControls.tsx# ปุ่ม Download, Pause, Resume, Cancel และตัวเลือกรวมไฟล์
│   │   ├── TelemetryLog.tsx  # หน้าต่าง Terminal แสดง Log และค้นหาข้อความ
│   │   ├── SpotlightCard.tsx # คอมโพเนนต์การ์ดแบบ React Bits Glassmorphism
│   │   └── HUDBackground.tsx # พื้นหลัง Cyber Grid และภาพเคลื่อนไหว Scanlines
│   ├── utils/tauri.ts        # Universal IPC Bridge รองรับทั้ง Desktop และ Web Simulator
│   ├── types/index.ts        # TypeScript Type Definitions
│   └── App.tsx               # State Machine หลักของระบบ
│
├── Legacy Python Modules/    # โมดูลภาษา Python เดิม (CLI & Scraper)
│   ├── cli.py                # Command-line interface
│   ├── gui.py                # หน้าต่างเดสก์ท็อปแบบเดิม (Tkinter)
│   ├── parser.py             # ตัวแกะข้อมูลซีรีส์เวอร์ชัน Python
│   ├── downloader.py         # ตัวดาวน์โหลดเวอร์ชัน Python
│   └── merger.py             # ตัวรวมไฟล์ FFmpeg เวอร์ชัน Python
└── tests/                    # ชุดการทดสอบ Unit Tests (ผ่าน 82/82 cases)
```

---

## การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### สิ่งที่ต้องเตรียม (Prerequisites)
1. **Node.js** (เวอร์ชัน 18 ขึ้นไป) และ `npm`
2. **Rust & Cargo** (เวอร์ชัน 1.75 ขึ้นไป) — ติดตั้งได้จาก [rust-lang.org](https://www.rust-lang.org/tools/install)
3. **FFmpeg** (จำเป็นสำหรับการรวมไฟล์วิดีโอ) — ดาวน์โหลดได้จาก [ffmpeg.org](https://ffmpeg.org/download.html) และเพิ่มลงใน System PATH

---

### ขั้นตอนการรันโปรแกรม

#### 1. Clone Repository
```bash
git clone https://github.com/bearnannan/rongyok-video-downloader.git
cd rongyok-video-downloader
```

#### 2. ติดตั้ง Dependencies ของ Frontend
```bash
npm install
```

#### 3. รันแอปพลิเคชันเดสก์ท็อป (Tauri Desktop App)
```bash
npm run tauri dev
```

#### 4. หรือรันผ่าน Web Browser (โหมดทดสอบบนเว็บ)
```bash
npm run dev
```
แล้วเปิดเบราว์เซอร์ไปที่ **[http://localhost:1420](http://localhost:1420)**

---

## การสร้างไฟล์สำหรับนำไปใช้งาน (Build Production Release)

สำหรับการสร้างไฟล์ `.exe` และตัวติดตั้งสำหรับแจกจ่าย:

```bash
npm run tauri build
```

ไฟล์โปรแกรมจะถูกสร้างไว้ที่:
- **Standalone `.exe`:** `src-tauri/target/release/rongyok-video-downloader.exe`
- **Windows Installer (`.msi` / `.exe`):** `src-tauri/target/release/bundle/nsis/` หรือ `msi/`

---

## การใช้งานผ่าน Command Line (Python CLI Mode)

หากต้องการใช้งานผ่าน Terminal ด้วย Python CLI แบบดั้งเดิม:

```bash
# 1. สร้างและเปิดใช้งาน Virtual Environment
python -m venv venv
venv\Scripts\activate      # สำหรับ Windows
source venv/bin/activate   # สำหรับ macOS/Linux

# 2. ติดตั้ง Dependencies ของ Python
pip install -r requirements.txt

# 3. ดาวน์โหลดทุกตอนของซีรีส์
python cli.py https://rongyok.com/watch/?series_id=8625

# 4. ดาวน์โหลดเฉพาะช่วงตอนที่กำหนด (เช่น ตอนที่ 1 ถึง 10)
python cli.py https://rongyok.com/watch/?series_id=8625 --episodes 1-10

# 5. ดาวน์โหลดเฉพาะตอนที่ระบุ (เช่น ตอนที่ 1, 3, 5, 7)
python cli.py https://rongyok.com/watch/?series_id=8625 --episodes 1,3,5,7

# 6. ดาวน์โหลดต่อจากเดิมที่ค้างไว้ (Resume)
python cli.py https://rongyok.com/watch/?series_id=8625 --resume

# 7. ดาวน์โหลดโดยไม่ต้องรวมไฟล์วิดีโอ
python cli.py https://rongyok.com/watch/?series_id=8625 --no-merge
```

---

## การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)

| ปัญหาที่พบ | สาเหตุ | วิธีแก้ไข |
|---|---|---|
| **URL Token หมดอายุ / HTTP 403** | ลิงก์ Discord CDN มีอายุ Token จำกัด | กดปุ่ม **FETCH DATA** เพื่อดึง Token ล่าสุด แล้วกดเริ่มดาวน์โหลดต่อได้ทันที |
| **FFmpeg: NOT FOUND** | ยังไม่ได้ติดตั้ง FFmpeg หรือไม่ได้ตั้งใน PATH | ติดตั้ง FFmpeg และตั้งค่า Environment Variable PATH ในระบบ |
| **Port 1420 is already in use** | มีโปรเซส Vite หรือ Tauri รันค้างอยู่ | ปิด Terminal เดิมที่รันอยู่ หรือกด `Ctrl + C` แล้วรันใหม่อีกครั้ง |

---

## สัญญาอนุญาต (License)

โครงการนี้เผยแพร่ภายใต้สัญญาอนุญาต **[MIT License](LICENSE)** — คุณสามารถนำไปใช้งาน, แก้ไข, และแจกจ่ายได้อย่างอิสระ

---

<p align="center">
  พัฒนาเพื่อการดาวน์โหลดวิดีโอที่รวดเร็วและมีประสิทธิภาพสูงสุด
</p>
