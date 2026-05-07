/**
 * charts.js — Chart.js wrapper พร้อม zoom/pan
 */

const charts = {

  instances: { home: null, graph: null, volt: null, amp: null },

  _makeOptions(color, enableZoom = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#3a3a3c',
          titleColor: 'rgba(235,235,245,.6)',
          bodyColor: '#fff',
          callbacks: {
            label: (c) => c.raw !== null
              ? Math.round(c.raw).toLocaleString('th-TH')
              : ' —',
          },
        },
        zoom: enableZoom ? {
          zoom: {
            wheel:   { enabled: true },
            pinch:   { enabled: true },
            mode:    'x',
          },
          pan: {
            enabled: true,
            mode:    'x',
          },
        } : {},
      },
      scales: {
        x: {
          ticks: { color: 'rgba(235,235,245,.3)', font: { size: 10 }, maxTicksLimit: 8 },
          grid:  { color: 'rgba(255,255,255,.04)' },
          border: { display: false },
        },
        y: {
          ticks: {
            color: 'rgba(235,235,245,.3)',
            font: { size: 10 },
            callback: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
          },
          grid:  { color: 'rgba(255,255,255,.04)' },
          border: { display: false },
          beginAtZero: true,
        },
      },
    };
  },

  _makeDataset(data, color) {
    return {
      data,
      borderColor: color,
      backgroundColor: color.replace(')', ', 0.08)').replace('rgb', 'rgba'),
      borderWidth: 2,
      pointRadius: 2,
      pointBackgroundColor: color,
      fill: true,
      tension: 0.4,
      spanGaps: true,
    };
  },

  _render(canvasId, key, labels, data, color, enableZoom = false) {
    if (this.instances[key]) this.instances[key].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    this.instances[key] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [this._makeDataset(data, color)] },
      options: this._makeOptions(color, enableZoom),
    });
  },

  /* ── Reset zoom ── */
  resetZoom(key) {
    if (this.instances[key]) this.instances[key].resetZoom();
  },

  /* ── Build data ── */
  _buildToday(rows, field) {
    const hm = {};
    rows.forEach((r) => {
      if (!r.time || r[field] === null) return;
      const h = r.time.getHours();
      (hm[h] = hm[h] || []).push(r[field]);
    });
    const labels = [], data = [];
    for (let h = 0; h < 24; h++) {
      labels.push(utils.pad(h) + ':00');
      const vals = hm[h];
      data.push(vals ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 : null);
    }
    return { labels, data };
  },

  _buildDays(allRows, days) {
    const labels = [], data = [];
    for (let d = days - 1; d >= 0; d--) {
      const day  = new Date(); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const dr   = allRows.filter((r) => r.time && r.time >= day && r.time < next);
      const ws   = dr.map((r) => r.w).filter((v) => v !== null);
      labels.push(d === 0 ? 'วันนี้' : utils.fmtDate(day));
      data.push(ws.length ? Math.round(ws.reduce((s, v) => s + v, 0) / ws.length) : null);
    }
    return { labels, data };
  },

  buildWattData(allRows, todayRows, view) {
    if (view === 'today') return this._buildToday(todayRows, 'w');
    return this._buildDays(allRows, view === 'week' ? 7 : 30);
  },

  /* ── Render ── */
  renderHome(allRows, todayRows, view, chartType = 'watt') {
    const fieldMap = { watt: 'w', volt: 'v', amp: 'a', pf: 'pf' };
    const colorMap = {
      watt: 'rgb(48, 209, 88)',
      volt: 'rgb(255, 214, 10)',
      amp:  'rgb(41, 182, 246)',
      pf:   'rgb(255, 159, 10)',
    };
    const field = fieldMap[chartType] || 'w';
    const color = colorMap[chartType] || 'rgb(48, 209, 88)';

    let labels, data;
    if (view === 'today') {
      ({ labels, data } = this._buildToday(todayRows, field));
    } else {
      ({ labels, data } = this._buildDays(allRows, view === 'week' ? 7 : 30));
    }
    this._render('lc', 'home', labels, data, color, false);
  },

  renderGraph(allRows, todayRows, view) {
    const { labels, data } = this.buildWattData(allRows, todayRows, view);
    this._render('gc', 'graph', labels, data, 'rgb(48, 209, 88)', true); // ← zoom เปิด
  },

  renderVolt(todayRows) {
    const { labels, data } = this._buildToday(todayRows, 'v');
    this._render('vc', 'volt', labels, data, 'rgb(255, 214, 10)', true); // ← zoom เปิด
  },

  renderAmp(todayRows) {
    const { labels, data } = this._buildToday(todayRows, 'a');
    this._render('ac2', 'amp', labels, data, 'rgb(41, 182, 246)', true); // ← zoom เปิด
  },

};
