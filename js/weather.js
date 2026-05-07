/**
 * weather.js — Open-Meteo API integration
 */

const weather = {

  fetched: false,

  CODES: {
    0: 'แดดจัด', 1: 'แดดเป็นส่วนใหญ่', 2: 'มีเมฆบางส่วน', 3: 'เมฆมาก',
    45: 'หมอก', 48: 'หมอกน้ำแข็ง',
    51: 'ฝนละออง', 53: 'ฝนละออง', 55: 'ฝนละออง',
    61: 'ฝนเบา', 63: 'ฝนปานกลาง', 65: 'ฝนหนัก',
    71: 'หิมะเบา', 73: 'หิมะ', 75: 'หิมะหนัก',
    80: 'ฝนตกเป็นช่วง', 81: 'ฝนตกเป็นช่วง', 82: 'ฝนหนักมาก',
    95: 'พายุฝนฟ้าคะนอง', 96: 'พายุพร้อมลูกเห็บ', 99: 'พายุรุนแรง',
  },

  ICONS: {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️',
    80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '🌪️',
  },

  DAYS_TH: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'],

  async fetch() {
    const house = CONFIG.HOUSES[app.currentHouseIdx];
    const { lat, lon } = house.LOCATION;
    document.getElementById('wx-location').textContent = '📍 ' + house.address;
    document.getElementById('wx-loading').style.display = 'block';
    document.getElementById('wx-content').style.display = 'none';
    document.getElementById('wx-error').style.display   = 'none';

    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,dew_point_2m,visibility,wind_direction_10m`
      + `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max`
      + `&timezone=Asia%2FBangkok&forecast_days=10`;

    try {
      const res = await window.fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      this._render(d);
      this.fetched = true;
    } catch (e) {
      document.getElementById('wx-loading').style.display = 'none';
      document.getElementById('wx-error').style.display   = 'block';
    }
  },

  _render(d) {
    const c = d.current, daily = d.daily;

    utils.setText('wx-temp',   Math.round(c.temperature_2m));
    utils.setText('wx-feels',  Math.round(c.apparent_temperature));
    utils.setText('wx-icon',   this.ICONS[c.weather_code] || '🌡️');
    utils.setText('wx-desc',   this.CODES[c.weather_code] || '—');
    utils.setText('wx-hum',    c.relative_humidity_2m + '%');
    utils.setText('wx-wind',   Math.round(c.wind_speed_10m));
    utils.setText('wx-dew',    c.dew_point_2m ? Math.round(c.dew_point_2m) : '—');
    utils.setText('wx-vis',    c.visibility    ? Math.round(c.visibility / 1000) : '—');
    utils.setText('wx-hi',     Math.round(daily.temperature_2m_max[0]));
    utils.setText('wx-lo',     Math.round(daily.temperature_2m_min[0]));
    utils.setText('wx-rain',   (daily.precipitation_probability_max[0] || 0) + '%');

    // UV Index with color coding
    const uv   = daily.uv_index_max[0];
    const uvEl = document.getElementById('wx-uv');
    uvEl.textContent = uv !== undefined ? Math.round(uv) : '—';
    uvEl.style.color = uv >= 11 ? '#ff453a' : uv >= 8 ? '#ff9f0a' : uv >= 6 ? '#ffd60a' : '#30d158';

    // 5-day forecast rows
    const daysEl = document.getElementById('wx-days');
    daysEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const date    = new Date(daily.time[i] + 'T00:00:00');
      const dayName = i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้'
                    : this.DAYS_TH[date.getDay()] + ' ' + date.getDate() + '/' + (date.getMonth() + 1);
      const rain    = daily.precipitation_probability_max[i] || 0;
      const row     = document.createElement('div');
      row.className = 'wx-day-row';
      row.innerHTML = `
        <div class="wx-day-name">${dayName}</div>
        <div class="wx-day-icon">${this.ICONS[daily.weather_code[i]] || '🌡️'}</div>
        <div class="wx-day-rain">${rain > 0 ? '💧' + rain + '%' : ''}</div>
        <div class="wx-day-range">
          ${Math.round(daily.temperature_2m_max[i])}°
          <small>${Math.round(daily.temperature_2m_min[i])}°</small>
        </div>`;
      daysEl.appendChild(row);
    }

    // Rain alert
    const alertEl  = document.getElementById('wx-alert-section');
    const maxRain  = Math.max(...daily.precipitation_probability_max.slice(0, 3));
    if (maxRain >= 70) {
      alertEl.innerHTML = `<div class="wx-alert-card">
        <div class="wx-alert-top">⚠️ เฝ้าระวัง</div>
        <div class="wx-alert-msg">โอกาสฝนตกสูง ${maxRain}% ใน 3 วันนี้</div>
      </div>`;
    } else if (maxRain >= 40) {
      alertEl.innerHTML = `<div class="wx-alert-card" style="border-color:#ffd60a">
        <div class="wx-alert-top" style="color:#ffd60a">🌦️ แจ้งเตือน</div>
        <div class="wx-alert-msg">อาจมีฝนตก ${maxRain}% ใน 3 วันนี้</div>
      </div>`;
    } else {
      alertEl.innerHTML = '';
    }

    utils.setText('wx-updated', utils.fmtTime(new Date()) + ' น.');
    document.getElementById('wx-loading').style.display = 'none';
    document.getElementById('wx-content').style.display = 'block';
  },

};
