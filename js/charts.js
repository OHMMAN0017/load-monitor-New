/**
 * charts.js — Chart.js wrapper for all 4 charts
 */

const charts = {

  instances: { home: null, graph: null, volt: null, amp: null },

  /* Shared Chart.js options factory */
  _makeOptions(color) {
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

  _render(canvasId, key, labels, data, color) {
    if (this.instances[key]) this.instances[key].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    this.instances[key] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [this._makeDataset(data, color)] },
      options: this._makeOptions(color),
    });
  },

  /* ── Build labels + data arrays from allRows ── */

  /** Hourly average for today */
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

  /** Daily average for N days */
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

  /* ── Public render methods ── */

  renderHome(allRows, todayRows, view) {
    const { labels, data } = this.buildWattData(allRows, todayRows, view);
    this._render('lc', 'home', labels, data, 'rgb(48, 209, 88)');
  },

  renderGraph(allRows, todayRows, view) {
    const { labels, data } = this.buildWattData(allRows, todayRows, view);
    this._render('gc', 'graph', labels, data, 'rgb(48, 209, 88)');
  },

  renderVolt(todayRows) {
    const { labels, data } = this._buildToday(todayRows, 'v');
    this._render('vc', 'volt', labels, data, 'rgb(255, 214, 10)');
  },

  renderAmp(todayRows) {
    const { labels, data } = this._buildToday(todayRows, 'a');
    this._render('amp', 'amp', labels, data, 'rgb(41, 182, 246)');
  },

};
