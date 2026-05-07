const CONFIG = {

  // Apps Script URL (ใช้ทั้งอ่านและเขียน)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxkZ6mTJ1gviVWx72D2mP5kp0qjcS08FBF7g6tPaTjWH4L0NBcz4qPejhy4R_xh2dWE/exec',

  HOUSES: [
    {
      id:      'house_141',
      label:   'บ้าน 141',
      address: '141/4 นครปฐม',
      SHEET:   'Sheet1',
      LOCATION: { lat: 13.8196, lon: 100.0413 },
      TARIFF_BAHT_PER_KWH: 4.5,
      ALERT_WATT: 3000,
    },
    {
      id:      'house_3913',
      label:   'บ้าน 39/13',
      address: '39/13 ตัวเมืองนครปฐม',
      SHEET:   '39/13',
      LOCATION: { lat: 13.8385, lon: 100.0295 },
      TARIFF_BAHT_PER_KWH: 4.5,
      ALERT_WATT: 3000,
    },
  ],

  STALE_THRESHOLD_MIN: 15,
  POLL_INTERVAL_MS:    60_000,
  RETRY_DELAYS_MS:     [5000, 10000, 30000, 60000, 120000],

};