const data = {

  rows: [],
  colMap: { ts: 0, v: 1, a: 2, w: 3, kwh: 4, hz: 5, pf: 6 },

  async fetch(csvUrl, houseId) {
    const res = await fetch(csvUrl + '&cb=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    cache.save(houseId, text);
    this.parse(text);
    return false;
  },

  parse(text) {
    const lines = text.trim().split('\n')
      .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
    if (lines.length < 2) throw new Error('CSV ว่างเปล่า');

    const hdr  = lines[0].map((h) => h.toLowerCase());
    const find = (...keys) => {
      const i = hdr.findIndex((h) => keys.some((k) => h.includes(k)));
      return i >= 0 ? i : -1;
    };

    this.colMap = {
      ts:  find('time','stamp','date')                    >= 0 ? find('time','stamp','date')                    : 0,
      v:   find('volt','(v)','v ')                        >= 0 ? find('volt','(v)','v ')                        : 1,
      a:   find('curr','amp','(a)','a ')                  >= 0 ? find('curr','amp','(a)','a ')                  : 2,
      w:   find('power','watt','(w)','w ','active')       >= 0 ? find('power','watt','(w)','w ','active')       : 3,
      kwh: find('kwh','energy')                           >= 0 ? find('kwh','energy')                           : 4,
      hz:  find('freq','hz')                              >= 0 ? find('freq','hz')                              : 5,
      pf:  find('pf','factor')                            >= 0 ? find('pf','factor')                            : 6,
    };

    const gf = (cols, i) => {
      if (i < 0 || i >= cols.length) return null;
      const v = parseFloat(cols[i]);
      return isNaN(v) ? null : v;
    };

    const parsed = lines.slice(1).map((cols) => {
      const ts = this.colMap.ts >= 0 ? cols[this.colMap.ts] : '';
      return {
        ts,
        time: utils.parseTS(ts),
        v:    gf(cols, this.colMap.v),
        a:    gf(cols, this.colMap.a),
        w:    gf(cols, this.colMap.w),
        kwh:  gf(cols, this.colMap.kwh),
        hz:   gf(cols, this.colMap.hz),
        pf:   gf(cols, this.colMap.pf),
      };
    }).filter((r) => r.w !== null && !isNaN(r.w));

    if (!parsed.length) throw new Error('ไม่พบคอลัมน์ Power (W) ใน CSV');
    this.rows = parsed;
  },

  todayRows() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return this.rows.filter((r) => r.time && r.time >= t);
  },

  calcKwh(rows) {
    if (!rows.length) return 0;
    // delta mode — sum ค่า kwh แต่ละรอบ
    const deltas = rows.map((r) => r.kwh).filter((v) => v !== null && v >= 0);
    if (deltas.length) return deltas.reduce((s, v) => s + v, 0);
    // fallback ประมาณจาก watt
    const ws = rows.map((r) => r.w).filter((v) => v !== null);
    if (!ws.length) return 0;
    return (ws.reduce((s, v) => s + v, 0) / ws.length / 1000) * (rows.length / 60);
  },

};