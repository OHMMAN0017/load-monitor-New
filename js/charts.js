const charts = {

  instances: { home: null, graph: null, volt: null, amp: null },

  /* ── Aggregate data by resolution ── */
  _aggregate(rows, field, resolution) {
    if (!rows.length) return { labels: [], data: [] };

    const buckets = {};

    rows.forEach((r) => {
      if (!r.time || r[field] === null) return;
      let key;
      const d = r.time;

      if (resolution === 'minute') {
        key = `${d.getMonth()+1}/${d.getDate()} ${utils.pad(d.getHours())}:${utils.pad(d.getMinutes())}`;
      } else if (resolution === 'hour') {
        key = `${d.getMonth()+1}/${d.getDate()} ${utils.pad(d.getHours())}:00`;
      } else { // day
        key = `${d.getDate()}/${d.getMonth()+1}`;
      }

      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(r[field]);
    });

    const labels = Object.keys(buckets);
    const data   = labels.map((k) => {
      const vals = buckets[k];
      return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100;
    });

    return { labels, data };
  },

  /* ── เลือก resolution ตามจำนวนข้อมูล ── */
  _autoResolution(rows) {
    if (rows.length <= 1440) return 'minute'; // ≤ 1 วัน
    if (rows.length <= 10080) return 'hour';  // ≤ 7 วัน
    return 'day';
  },

  _makeOptions(color, enableZoom = false) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
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
            wheel:   { enabled: true, speed: 0.1 },
            pinch:   { enabled: true },
            mode:    'x',
            onZoom:  ({ chart }) => charts._onZoom(chart),
          },
          pan: {
            enabled: true,
            mode:    'x',
          },
        } : {},
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(235,235,245,.3)',
            font: { size: 10 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
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
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      tension: 0.3,
      spanGaps: true,
    };
  },

  /* ── เมื่อ zoom เปลี่ยน → re-render ด้วย resolution ใหม่ ── */
  _onZoom(chart) {
    // ดึง range ที่กำลังดูอยู่
    const xAxis   = chart.scales.x;
    const visible = xAxis.max - xAxis.min;
    const total   = chart.data.labels.length;
    const ratio   = visible / total;

    // ถ้า zoom เข้ามากพอ → เปลี่ยนเป็น minute
    if (ratio < 0.1 && charts._graphResolution !== 'minute') {
      charts._graphResolution = 'minute';
      charts.renderGraph(charts._lastAllRows, charts._lastTodayRows, 'all');
    } else if (ratio >= 0.1 && ratio < 0.5 && charts._graphResolution !== 'hour') {
      charts._graphResolution = 'hour';
      charts.renderGraph(charts._lastAllRows, charts._lastTodayRows, 'all');
    } else if (ratio >= 0.5 && charts._graphResolution !== 'day') {
      charts._graphResolution = 'day';
      charts.renderGraph(charts._lastAllRows, charts._lastTodayRows, 'all');
    }
  },

  _graphResolution: 'hour',
  _lastAllRows:     [],
  _lastTodayRows:   [],

  _render(canvasId, key, labels, data, color, enableZoom = false) {
    if (this.instances[key]) this.instances[key].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    this.instances[key] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [this._makeDataset(data, color)] },
      options: this._makeOptions(color, enableZoom),
    });
  },

  resetZoom(key) {
    if (this.instances[key]) this.instances[key].resetZoom();
  },

  /* ── Home chart (ย่อ — แสดงแค่วันนี้ รายชั่วโมง) ── */
  renderHome(allRows, todayRows, view) {
    const res   = view === 'today' ? 'hour' : 'day';
    const rows  = view === 'today' ? todayRows : allRows;
    const { labels, data } = this._aggregate(rows, 'w', res);
    this._render('lc', 'home', labels, data, 'rgb(48, 209, 88)', false);
  },

  /* ── Graph chart (ใหญ่ — ข้อมูลทั้งหมด + zoom) ── */
  renderGraph(allRows, todayRows, view) {
    this._lastAllRows   = allRows;
    this._lastTodayRows = todayRows;

    // auto resolution ตามขนาดข้อมูล
    if (!this._graphResolution || view !== 'all') {
      this._graphResolution = this._autoResolution(allRows);
    }

    const { labels, data } = this._aggregate(allRows, 'w', this._graphResolution);
    this._render('gc', 'graph', labels, data, 'rgb(48, 209, 88)', true);

    // อัพเดต label แสดง resolution
    const resLabel = document.getElementById('graphResLabel');
    if (resLabel) {
      resLabel.textContent = this._graphResolution === 'minute' ? 'รายนาที'
                           : this._graphResolution === 'hour'   ? 'รายชั่วโมง'
                           : 'รายวัน';
    }
  },

  renderVolt(todayRows) {
    const { labels, data } = this._aggregate(todayRows, 'v', 'hour');
    this._render('vc', 'volt', labels, data, 'rgb(255, 214, 10)', true);
  },

  renderAmp(todayRows) {
    const { labels, data } = this._aggregate(todayRows, 'a', 'hour');
    this._render('ac2', 'amp', labels, data, 'rgb(41, 182, 246)', true);
  },

};