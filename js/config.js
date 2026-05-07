const CONFIG = {

  HOUSES: [
    {
      id:      'house_141',
      label:   'บ้าน 141',
      address: '141/4 นครปฐม',
      CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRx9jo4W-ReWS8yKmNj1P-d2HSgEG1PPgo_Fs1tXC6XmRkvq6CkiKDDAo5IUdsiG-CM0pjdc1jqAHoC/pub?gid=0&single=true&output=csv',
      LOCATION: { lat: 13.8196, lon: 100.0413 },
      TARIFF_BAHT_PER_KWH: 4.5,
      ALERT_WATT: 3000,
    },
    {
      id:      'house_3913',
      label:   'บ้าน 39/13',
      address: '39/13 ตัวเมืองนครปฐม',
      CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRx9jo4W-ReWS8yKmNj1P-d2HSgEG1PPgo_Fs1tXC6XmRkvq6CkiKDDAo5IUdsiG-CM0pjdc1jqAHoC/pub?gid=982166867&single=true&output=csv',
      LOCATION: { lat: 13.8385, lon: 100.0295 },
      TARIFF_BAHT_PER_KWH: 4.5,
      ALERT_WATT: 3000,
    },
  ],

  STALE_THRESHOLD_MIN: 15,
  POLL_INTERVAL_MS:    60_000,
  RETRY_DELAYS_MS:     [5000, 10000, 30000, 60000, 120000],

};