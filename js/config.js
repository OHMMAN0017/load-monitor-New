/**
 * config.js — แก้ไขค่าตรงนี้เพื่อปรับแต่งแอพ
 * ============================================
 */
const CONFIG = {

  /* Google Sheets CSV URL
   * วิธีได้ URL:
   *   Google Sheets → File → Share → Publish to web
   *   เลือก Sheet ที่ต้องการ → CSV → Copy link
   */
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRx9jo4W-ReWS8yKmNj1P-d2HSgEG1PPgo_Fs1tXC6XmRkvq6CkiKDDAo5IUdsiG-CM0pjdc1jqAHoC/pub?gid=0&single=true&output=csv',

  /* อัตราค่าไฟ (บาท/kWh) — ปรับตามโครงสร้างที่ใช้จริง */
  TARIFF_BAHT_PER_KWH: 4.5,

  /* โหลดสูงสุดที่ยอมรับได้ (W) — เกินนี้จะแสดงสีแดง */
  ALERT_WATT: 3000,

  /* พิกัดสถานที่ — ใช้สำหรับพยากรณ์อากาศ */
  LOCATION: {
    lat:   13.8196,
    lon:   100.0413,
    label: 'นครปฐม, ประเทศไทย',
  },

  /* ถ้า timestamp ล่าสุดใน Sheet เก่ากว่านี้ (นาที)
   * จะถือว่าเครื่องวัดออฟไลน์ → แสดง stale badge     */
  STALE_THRESHOLD_MIN: 15,

  /* รอบการดึงข้อมูลอัตโนมัติ (มิลลิวินาที) — default 60 วินาที */
  POLL_INTERVAL_MS: 60_000,

  /* Exponential backoff delays เมื่อ fetch ล้มเหลว (มิลลิวินาที) */
  RETRY_DELAYS_MS: [5_000, 10_000, 30_000, 60_000, 120_000],

};
