# ⚡ Load Monitor

แอพมือถือสำหรับติดตามโหลดไฟฟ้าแบบ real-time ผ่าน Google Sheets
รองรับ PZEM-004T + ESP32 + Google Apps Script

![preview](https://img.shields.io/badge/platform-web%20app-blue)
![license](https://img.shields.io/badge/license-MIT-green)

---

## 📱 Features

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🔴 Live readings | W, V, A, PF, Hz อัปเดตทุก 60 วินาที |
| 🟡 Stale detection | badge แสดงอายุข้อมูล ถ้าเครื่องวัดออฟไลน์ |
| 📦 Offline cache | ไม่ให้เป็น "—" เมื่อ fetch ล้มเหลว |
| 📡 Auto-reconnect | Exponential backoff (5s→10s→30s→60s→120s) |
| 📊 Charts | Load profile วันนี้ / 7 วัน / 30 วัน + V + A |
| 📈 Statistics | Peak, avg, min, kWh วันนี้, ค่าไฟเดือนนี้ |
| 🌤️ Weather | Open-Meteo 5-day forecast (ไม่ต้องใช้ API key) |

---

## 🗂️ Project Structure

```
load-monitor/
├── index.html          # Main HTML
├── css/
│   └── style.css       # All styles
└── js/
    ├── config.js       # ← แก้ค่าตรงนี้
    ├── utils.js        # Helper functions
    ├── cache.js        # localStorage wrapper
    ├── charts.js       # Chart.js wrapper
    ├── weather.js      # Open-Meteo API
    ├── ui.js           # DOM rendering
    ├── data.js         # CSV fetch & parse
    └── app.js          # Main controller
```

---

## ⚙️ Setup

### 1. แก้ไข `js/config.js`

```js
const CONFIG = {
  // URL จาก Google Sheets → File → Share → Publish to web → CSV
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/YOUR_ID/pub?gid=0&single=true&output=csv',

  TARIFF_BAHT_PER_KWH: 4.5,   // อัตราค่าไฟ
  ALERT_WATT: 3000,            // โหลดสูงสุดที่ยอมรับ (W)

  LOCATION: {
    lat:   13.8196,            // พิกัด latitude
    lon:   100.0413,           // พิกัด longitude
    label: 'นครปฐม, ประเทศไทย',
  },

  STALE_THRESHOLD_MIN: 15,     // นาทีที่ถือว่าข้อมูลเก่า
  POLL_INTERVAL_MS:    60_000, // รอบดึงข้อมูล (ms)
};
```

### 2. Google Sheets format

| Timestamp | Voltage (V) | Current (A) | Power (W) | Energy (kWh) | Frequency (Hz) | PF |
|---|---|---|---|---|---|---|
| 2025-01-01 08:00 | 220.5 | 1.23 | 271 | 0.123 | 50.01 | 0.98 |

> หัวตารางไม่ต้องตรงทุกตัวอักษร — app จะ auto-detect จากชื่อคอลัมน์

### 3. Deploy

ใช้ได้เลยโดยไม่ต้องติดตั้งอะไร — เป็น static HTML ล้วน

```bash
# GitHub Pages
git add .
git commit -m "initial"
git push

# หรือเปิดตรง local
open index.html
```

---

## 🔌 Hardware Stack

```
PZEM-004T  →  ESP32  →  Google Apps Script  →  Google Sheets  →  แอพนี้
```

### ESP32 Google Apps Script endpoint ตัวอย่าง

```javascript
// Code.gs
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const { v, a, w, kwh, hz, pf } = e.parameter;
  sheet.appendRow([new Date(), v, a, w, kwh, hz, pf]);
  return ContentService.createTextOutput('ok');
}
```

---

## 📊 Stale Data Logic

```
เมื่อติดตั้ง PZEM ใหม่ ข้อมูลใหม่จะเขียนลง Sheet อัตโนมัติ
timestamp จะเป็นปัจจุบัน → badge หาย → pill กลับเป็น Online
```

| สถานะ | pill | badge |
|---|---|---|
| ข้อมูลสด (< 15 นาที) | 🟢 Online | ซ่อน |
| ข้อมูลเก่า (≥ 15 นาที) | 🟡 ข้อมูลล่าสุด · DD/MM HH:MM | 🕐 เมื่อ X นาทีที่แล้ว |
| fetch ล้มเหลว | 🔴 โหลดไม่สำเร็จ | แสดง + dim |
| Offline | 🔴 Offline | แสดง cache |

---

## 🛠️ Customization

ปรับค่าทั้งหมดใน `js/config.js` — ไม่ต้องแก้ไฟล์อื่น

| ตัวแปร | ค่า default | ความหมาย |
|---|---|---|
| `TARIFF_BAHT_PER_KWH` | 4.5 | อัตราค่าไฟ |
| `ALERT_WATT` | 3000 | โหลดสูงเกินแสงแดง |
| `STALE_THRESHOLD_MIN` | 15 | นาทีก่อนแสดง stale badge |
| `POLL_INTERVAL_MS` | 60000 | รอบดึงข้อมูล |
| `RETRY_DELAYS_MS` | [5,10,30,60,120]s | backoff delays |

---

## 📄 License

MIT
