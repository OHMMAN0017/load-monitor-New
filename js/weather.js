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
    const c = d.current, daily = d.daily, hourly = d.hourly;
    const now = new Date();
    const currentHour = now.getHours();

    // ── Background animation ──
    const code = c.weather_code;
    const wxView = document.getElementById('view-weather');
    const bgClass = this._bgClass(code);
    wxView.className = 'view active wx-bg-' + bgClass;
    this._startBgAnimation(bgClass);

    // ── Current ──
    utils.setText('wx-temp',  Math.round(c.temperature_2m));
    utils.setText('wx-feels', Math.round(c.apparent_temperature));
    utils.setText('wx-icon',  this.ICONS[code] || '🌡️');
    utils.setText('wx-desc',  this.CODES[code] || '—');
    utils.setText('wx-hum',   c.relative_humidity_2m + '%');
    utils.setText('wx-wind',  Math.round(c.wind_speed_10m) + ' km/h');
    utils.setText('wx-dew',   c.dew_point_2m ? Math.round(c.dew_point_2m) : '—');
    utils.setText('wx-vis',   c.visibility ? Math.round(c.visibility / 1000) : '—');
    utils.setText('wx-hi',    Math.round(daily.temperature_2m_max[0]));
    utils.setText('wx-lo',    Math.round(daily.temperature_2m_min[0]));

    // Wind direction
    const dir = c.wind_direction_10m;
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const dirText = dirs[Math.round(dir / 45) % 8];
    utils.setText('wx-wind-dir', dirText);

    // UV
    const uv = daily.uv_index_max[0];
    const uvEl = document.getElementById('wx-uv');
    uvEl.textContent = uv !== undefined ? Math.round(uv) : '—';
    uvEl.style.color = uv >= 11 ? '#ff453a' : uv >= 8 ? '#ff9f0a' : uv >= 6 ? '#ffd60a' : '#30d158';
    const uvLevels = ['ต่ำ','ต่ำ','ต่ำ','ปานกลาง','ปานกลาง','สูง','สูง','สูงมาก','สูงมาก','สูงมาก','สูงมาก','อันตราย'];
    utils.setText('wx-uv-level', uvLevels[Math.min(Math.round(uv||0), 11)]);

    // ── Hourly forecast (24 ชม.) ──
    const hourlyEl = document.getElementById('wx-hourly');
    hourlyEl.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const realIdx = currentHour + i < hourly.time.length ? currentHour + i : -1;
      if (realIdx < 0) continue;
      const t    = new Date(hourly.time[realIdx]);
      const temp = Math.round(hourly.temperature_2m[realIdx]);
      const rain = hourly.precipitation_probability[realIdx] || 0;
      const wc   = hourly.weather_code[realIdx];
      const col  = document.createElement('div');
      col.className = 'wx-hour-col';
      col.innerHTML = `
        <div class="wx-hour-time">${i === 0 ? 'ตอนนี้' : utils.pad(t.getHours()) + ':00'}</div>
        <div class="wx-hour-rain">${rain > 20 ? '💧' + rain + '%' : ''}</div>
        <div class="wx-hour-icon">${this.ICONS[wc] || '🌡️'}</div>
        <div class="wx-hour-temp">${temp}°</div>`;
      hourlyEl.appendChild(col);
    }

    // ── Rain probability chart ──
    this._renderRainChart(hourly, currentHour);

    // ── 10-day forecast ──
    const daysEl = document.getElementById('wx-days');
    daysEl.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const date    = new Date(daily.time[i] + 'T00:00:00');
      const dayName = i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้'
                    : this.DAYS_TH[date.getDay()] + ' ' + date.getDate() + '/' + (date.getMonth() + 1);
      const rain    = daily.precipitation_probability_max[i] || 0;
      const maxT    = Math.round(daily.temperature_2m_max[i]);
      const minT    = Math.round(daily.temperature_2m_min[i]);
      const row     = document.createElement('div');
      row.className = 'wx-day-row';
      row.innerHTML = `
        <div class="wx-day-name">${dayName}</div>
        <div class="wx-day-icon">${this.ICONS[daily.weather_code[i]] || '🌡️'}</div>
        <div class="wx-day-rain">${rain > 0 ? '💧' + rain + '%' : ''}</div>
        <div class="wx-day-range">${maxT}° <small>${minT}°</small></div>`;
      daysEl.appendChild(row);
    }

    // ── Alert ──
    const alertEl = document.getElementById('wx-alert-section');
    const maxRain = Math.max(...daily.precipitation_probability_max.slice(0, 3));
    if (maxRain >= 70) {
      alertEl.innerHTML = `<div class="wx-alert-card"><div class="wx-alert-top">⚠️ เฝ้าระวัง</div><div class="wx-alert-msg">โอกาสฝนตกสูง ${maxRain}% ใน 3 วันนี้</div></div>`;
    } else if (maxRain >= 40) {
      alertEl.innerHTML = `<div class="wx-alert-card" style="border-color:#ffd60a"><div class="wx-alert-top" style="color:#ffd60a">🌦️ แจ้งเตือน</div><div class="wx-alert-msg">อาจมีฝนตก ${maxRain}% ใน 3 วันนี้</div></div>`;
    } else {
      alertEl.innerHTML = '';
    }

    utils.setText('wx-updated', utils.fmtTime(new Date()) + ' น.');
    document.getElementById('wx-loading').style.display = 'none';
    document.getElementById('wx-content').style.display = 'block';

    // ── Home mini-card ──
    const homeCard = document.getElementById('home-wx-card');
    if (homeCard) {
      utils.setText('home-wx-icon', this.ICONS[code] || '🌡️');
      utils.setText('home-wx-temp', Math.round(c.temperature_2m));
      utils.setText('home-wx-desc', this.CODES[code] || '—');
      utils.setText('home-wx-hi',   Math.round(daily.temperature_2m_max[0]));
      utils.setText('home-wx-lo',   Math.round(daily.temperature_2m_min[0]));
      utils.setText('home-wx-hum',  c.relative_humidity_2m + '%');
      homeCard.style.display = 'flex';
    }
  },

  _bgClass(code) {
    if (code === 0 || code === 1) return 'sunny';
    if (code <= 3) return 'cloudy';
    if (code <= 48) return 'foggy';
    if (code <= 67) return 'rainy';
    if (code <= 77) return 'snowy';
    if (code <= 82) return 'rainy';
    return 'stormy';
  },

  _renderRainChart(hourly, currentHour) {
    const canvas = document.getElementById('wx-rain-chart');
    if (!canvas) return;
    if (this._rainChart) this._rainChart.destroy();
    const labels = [], data = [];
    for (let i = 0; i < 24; i++) {
      const idx = currentHour + i;
      if (idx >= hourly.time.length) break;
      const t = new Date(hourly.time[idx]);
      labels.push(i === 0 ? 'ตอนนี้' : utils.pad(t.getHours()) + ':00');
      data.push(hourly.precipitation_probability[idx] || 0);
    }
    this._rainChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => v >= 70 ? '#ff453a99' : v >= 40 ? '#ff9f0a99' : '#29b6f699'),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + '%' } } },
        scales: {
          x: { ticks: { color: 'rgba(235,235,245,.4)', font: { size: 9 }, maxTicksLimit: 8 }, grid: { display: false }, border: { display: false } },
          y: { min: 0, max: 100, ticks: { color: 'rgba(235,235,245,.4)', font: { size: 9 }, callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,.04)' }, border: { display: false } },
        },
      },
    });
  },
  _startBgAnimation(bgClass) {
    const oldBg = document.getElementById('wx-bg-container');
    if (oldBg) oldBg.remove();

    const view = document.getElementById('view-weather');
    const bg   = document.createElement('div');
    bg.id = 'wx-bg-container';
    view.insertBefore(bg, view.firstChild);

    const bgColors = {
      sunny:  'linear-gradient(180deg, #1a6fc4 0%, #1c1c1e 80%)',
      cloudy: 'linear-gradient(180deg, #4a5568 0%, #1c1c1e 80%)',
      foggy:  'linear-gradient(180deg, #6b7280 0%, #1c1c1e 80%)',
      rainy:  'linear-gradient(180deg, #1e3a5f 0%, #1c1c1e 80%)',
      stormy: 'linear-gradient(180deg, #1a1a2e 0%, #1c1c1e 80%)',
      snowy:  'linear-gradient(180deg, #c7e9fb 0%, #1c1c1e 80%)',
    };
    const grad = bgColors[bgClass] || bgColors.rainy;
    bg.style.background = grad;

    const phone = document.querySelector('.phone');
    phone.style.setProperty('--wx-bg', grad);
    // ใส่ wx-active เฉพาะตอนอยู่บน weather tab เท่านั้น
    // ถ้า fetch มาจาก background (init) จะไม่เปลี่ยน bg ของหน้าอื่น
    if (app.currentNav === 'weather') {
      phone.classList.add('wx-active');
    }

    if (bgClass === 'sunny') {
      const ray = document.createElement('div');
      ray.className = 'wx-particle wx-sun-ray';
      bg.appendChild(ray);
      for (let i = 0; i < 3; i++) {
        const c = document.createElement('div');
        c.className = 'wx-particle wx-cloud';
        c.textContent = '☁️';
        c.style.top = (20 + i * 80) + 'px';
        c.style.animationDuration = (20 + i * 8) + 's';
        c.style.animationDelay = (i * 5) + 's';
        bg.appendChild(c);
      }
    }

    if (bgClass === 'rainy' || bgClass === 'stormy') {
      for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'wx-particle wx-rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.top  = Math.random() * 100 + '%';
        drop.style.animationDuration = (0.6 + Math.random() * 0.8) + 's';
        drop.style.animationDelay    = (Math.random() * 2) + 's';
        drop.style.opacity = 0.4 + Math.random() * 0.4;
        bg.appendChild(drop);
      }
    }

    if (bgClass === 'stormy') {
      const flash = document.createElement('div');
      flash.className = 'wx-lightning';
      flash.style.animationDuration = (2 + Math.random() * 4) + 's';
      bg.appendChild(flash);
      this._lightningEl = flash;
    }

    if (bgClass === 'cloudy') {
      for (let i = 0; i < 4; i++) {
        const c = document.createElement('div');
        c.className = 'wx-particle wx-cloud';
        c.textContent = i % 2 === 0 ? '☁️' : '🌥️';
        c.style.top = (30 + i * 70) + 'px';
        c.style.animationDuration = (25 + i * 6) + 's';
        c.style.animationDelay = (i * 4) + 's';
        bg.appendChild(c);
      }
    }

    if (bgClass === 'foggy') {
      for (let i = 0; i < 3; i++) {
        const f = document.createElement('div');
        f.className = 'wx-particle wx-fog';
        f.textContent = '🌫️';
        f.style.top = (100 + i * 100) + 'px';
        f.style.animationDuration = (30 + i * 10) + 's';
        f.style.animationDelay = (i * 8) + 's';
        bg.appendChild(f);
      }
    }
  },
};
