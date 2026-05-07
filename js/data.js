const data = {

  rows: [],
  colMap: { ts: 0, v: 1, a: 2, w: 3, kwh: 4, hz: 5, pf: 6 },

  /* ── Fetch จาก Apps Script ── */
  async fetch(houseId, sheet, period = 'latest', resolution = 'hour') {
    const url = CONFIG.GAS_URL
      + '?action=read'
      + '&sheet='      + encodeURIComponent(sheet)
      + '&period='     + period
      + '&resolution=' + resolution;

    const res = await fetch(url + '&cb=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json = await res.json();
    if (json.error) throw new Error(json.error);

    cache.save(houseId, JSON.stringify(json.rows));
    this.parseRows(json.rows);
    return false;
  },

  /* ── Parse rows จาก Apps Script ── */
  parseRows(rows) {
    if (!rows || !rows.length) throw new Error('ไม่มีข้อมูล');

    this.rows = rows.map((r) => {
      return {
        ts:   r[0],
        time: utils.parseTS(r[0]),
        v:    parseFloat(r[1]) || null,
        a:    parseFloat(r[2]) || null,
        w:    parseFloat(r[3]) || null,
        kwh:  parseFloat(r[4]) || null,
        hz:   parseFloat(r[5]) || null,
        pf:   parseFloat(r[6]) || null,
      };
    }).filter((r) => r.w !== null && !isNaN(r.w));

    if (!this.rows.length) throw new Error('ไม่มีข้อมูล W');
  },

  /* ── Load cache ── */
  loadFromCache(houseId) {
    const { text } = cache.load(houseId);
    if (!text) return false;
    try {
      const rows = JSON.parse(text);
      this.parseRows(rows);
      return true;
    } catch (e) {
      return false;
    }
  },

  todayRows() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return this.rows.filter((r) => r.time && r.time >= t);
  },

  calcKwh(rows) {
    if (!rows.length) return 0;
    const kwhVals = rows.map((r) => r.kwh).filter((v) => v !== null);
    if (!kwhVals.length) {
      const ws = rows.map((r) => r.w).filter((v) => v !== null);
      if (!ws.length) return 0;
      return (ws.reduce((s, v) => s + v, 0) / ws.length / 1000) * (rows.length / 60);
    }
    const isAbsolute = kwhVals[kwhVals.length - 1] > kwhVals[0] + 1;
    if (isAbsolute) {
      return Math.max(0, kwhVals[kwhVals.length - 1] - kwhVals[0]);
    } else {
      return kwhVals.reduce((s, v) => s + v, 0);
    }
  },

};