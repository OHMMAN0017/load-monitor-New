const ui = {

  /* ── House Tabs ── */

  buildHouseTabs(houses, onSelect) {
    const wrap = document.getElementById('houseTabs');
    wrap.innerHTML = '';
    houses.forEach((h, i) => {
      const btn = document.createElement('button');
      btn.className   = 'house-tab' + (i === 0 ? ' active' : '');
      btn.textContent = h.label;
      btn.onclick     = () => onSelect(i);
      wrap.appendChild(btn);
    });
  },

  setActiveHouseTab(idx) {
    document.querySelectorAll('.house-tab').forEach((b, i) => {
      b.classList.toggle('active', i === idx);
    });
  },

  /* ── Status Pill ── */

  setStatus(state, label) {
    const pill = document.getElementById('statusPill');
    const dot  = document.getElementById('statusDot');
    pill.className = 'status-pill pill-' + state;
    dot.className  = 'status-dot dot-' + state;
    document.getElementById('statusLabel').textContent = label;
  },

  setRetryInfo(text) {
    document.getElementById('retryInfo').textContent = text;
  },

  /* ── Offline / Stale Banner ── */

  showStaleBanner(lastRowTime, fromCache) {
    const b   = document.getElementById('offlineBanner');
    const msg = document.getElementById('offlineMsg');
    const c   = document.getElementById('cachedAt');
    msg.textContent = fromCache
      ? 'โหลดจาก cache — ยังไม่มีการเชื่อมต่อ Sheet'
      : 'เครื่องวัดออฟไลน์ หรือยังไม่ได้ติดตั้ง — แสดงค่าล่าสุดที่มีใน Sheet';
    c.textContent = 'ข้อมูลล่าสุด: ' + utils.fmtFull(lastRowTime);
    b.classList.add('show');
  },

  hideStaleBanner() {
    document.getElementById('offlineBanner').classList.remove('show');
  },

  /* ── Stale Badge ── */

  updateStaleBadge(latestTime) {
    const badge  = document.getElementById('staleBadge');
    const agoEl  = document.getElementById('staleAgo');
    const wattEl = document.getElementById('wattVal');
    if (!latestTime) return;
    const diffMin = (Date.now() - latestTime.getTime()) / 60_000;
    if (diffMin >= CONFIG.STALE_THRESHOLD_MIN) {
      badge.classList.remove('hidden');
      agoEl.textContent = utils.timeAgoTH(latestTime);
      wattEl.classList.add('stale');
    } else {
      badge.classList.add('hidden');
      wattEl.classList.remove('stale');
    }
  },

  /* ── Main Readings ── */

  renderHome(allRows, todayRows, fromCache, house) {
    const latest  = allRows[allRows.length - 1];
    const diffMin = latest.time ? (Date.now() - latest.time.getTime()) / 60_000 : 9999;
    const isStale = diffMin >= CONFIG.STALE_THRESHOLD_MIN;

    // Banner & pill
    if (isStale || fromCache) {
      this.showStaleBanner(latest.time, fromCache);
      this.setStatus('stale', 'ข้อมูลล่าสุด · ' + utils.fmtFull(latest.time));
    } else {
      this.hideStaleBanner();
      this.setStatus('online', 'Online · อัปเดต ' + utils.fmtTime(new Date()) + ' น.');
    }

    // Watt
    // Watt — แสดงค่าเฉลี่ยทั้งหมด
    const allWs = allRows.map(r => r.w).filter(v => v !== null);
    const w     = allWs.length ? Math.round(allWs.reduce((s,v) => s+v,0) / allWs.length) : (latest.w || 0);
    const wEl   = document.getElementById('wattVal');
    wEl.className = 'load-value' + (w > house.ALERT_WATT ? ' critical' : w > 2000 ? ' high' : '') + (isStale ? ' stale' : '');
    utils.animateNumber(wEl, w);
    document.getElementById('wattUnit').style.opacity = '1';

    this.updateStaleBadge(latest.time);

    // Meta
    utils.setText('vVal',  latest.v  != null ? latest.v.toFixed(1)  : '—');
    utils.setText('aVal',  latest.a  != null ? latest.a.toFixed(2)  : '—');
    utils.setText('pfVal', latest.pf != null ? latest.pf.toFixed(2) : '—');

    // PF bar
    const pf    = latest.pf || 0;
    const pfBar = document.getElementById('pfBar');
    utils.setText('pfBig', pf ? pf.toFixed(2) : '—');
    pfBar.style.width      = Math.min(100, pf * 100) + '%';
    pfBar.style.background = pf > 0.95 ? '#30d158' : pf > 0.85 ? '#ffd60a' : '#ff453a';

    // Hz bar
    const hz    = latest.hz || 50;
    const hzBar = document.getElementById('hzBar');
    utils.setText('hzBig', hz ? hz.toFixed(1) + ' Hz' : '—');
    hzBar.style.width = Math.min(100, Math.max(0, ((hz - 49) / 2) * 100)) + '%';

    // kWh / cost
    const tkwh  = data.calcKwh(todayRows);
    const now   = new Date();
    const mRows = allRows.filter((r) => r.time && r.time >= new Date(now.getFullYear(), now.getMonth(), 1));
    const mkwh  = data.calcKwh(mRows);

    utils.setHtml('todayKwh', tkwh.toFixed(2) + '<small> kWh</small>');
    utils.setHtml('monthKwh', mkwh.toFixed(1)  + '<small> kWh</small>');
    document.getElementById('monthBaht').textContent
      = '≈' + utils.calcProgressiveTariff(mkwh).toLocaleString('th-TH') + ' ฿';

    // Yesterday comparison
    const yStart = new Date(now); yStart.setDate(yStart.getDate() - 1); yStart.setHours(0, 0, 0, 0);
    const yEnd   = new Date(now); yEnd.setHours(0, 0, 0, 0);
    const ykwh   = data.calcKwh(allRows.filter((r) => r.time && r.time >= yStart && r.time < yEnd));
    const chEl   = document.getElementById('todayChange');
    if (ykwh > 0) {
      const pct = (tkwh - ykwh) / ykwh * 100;
      chEl.className   = 'card-sub ' + (pct > 0 ? 'up' : 'down');
      chEl.textContent = (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(0) + '% จากเมื่อวาน';
    } else {
      chEl.textContent = 'ข้อมูลทั้งหมด';
    }

    // Peak card — ใช้ข้อมูลทั้งหมด
    const allPeakWs = allRows.map((r) => r.w).filter((v) => v !== null);
    if (allPeakWs.length) {
      const maxW  = Math.max(...allPeakWs);
      const peakI = allRows.findIndex((r) => r.w === maxW);
      const peakT = peakI >= 0 ? allRows[peakI].time : null;
      utils.setHtml('peakVal', Math.round(maxW).toLocaleString('th-TH') + '<small> W</small>');
      document.getElementById('peakTime').textContent = peakT ? utils.fmtFull(peakT) : '—';
    } else {
      utils.setHtml('peakVal', '—');
      document.getElementById('peakTime').textContent = '—';
    }

    // Tariff rate card — แสดงอัตราที่ใช้อยู่ตามระดับการใช้เดือนนี้
    const tariffRate = document.getElementById('tariffRate');
    const tariffSub  = tariffRate ? tariffRate.nextElementSibling : null;
    if (tariffRate) {
      let rate, label;
      if (mkwh <= 150)      { rate = '3.25 ฿/หน่วย'; label = '≤ 150 หน่วย'; }
      else if (mkwh <= 400) { rate = '4.22 ฿/หน่วย'; label = '151–400 หน่วย'; }
      else                  { rate = '4.42 ฿/หน่วย'; label = '> 400 หน่วย'; }
      tariffRate.textContent = rate;
      if (tariffSub) tariffSub.textContent = label + ' · เดือนนี้ ' + mkwh.toFixed(0) + ' หน่วย';
    }

    document.getElementById('updateTime').textContent
      = (fromCache ? '📦 (cache) ' : '')
      + 'ดึงข้อมูล ' + utils.fmtTime(new Date()) + ' น. · ' + allRows.length + ' records';
  },

  renderStats(allRows, todayRows, house) {
    const latest = allRows[allRows.length - 1];
    const ws     = todayRows.map((r) => r.w).filter((v) => v !== null);
    const tkwh   = data.calcKwh(todayRows);
    const now    = new Date();
    const mRows  = allRows.filter((r) => r.time && r.time >= new Date(now.getFullYear(), now.getMonth(), 1));
    const mkwh   = data.calcKwh(mRows);

    if (ws.length) {
      const maxW  = Math.max(...ws), minW = Math.min(...ws);
      const avgW  = ws.reduce((s, v) => s + v, 0) / ws.length;
      const peakI = todayRows.findIndex((r) => r.w === maxW);
      const peakT = peakI >= 0 ? todayRows[peakI].time : null;
      utils.setText('s-todayKwh',  tkwh.toFixed(2));
      utils.setText('s-peakW',     Math.round(maxW).toLocaleString('th-TH'));
      document.getElementById('s-peakTime').textContent  = peakT ? utils.fmtTime(peakT) + ' น.' : '—';
      document.getElementById('s-peakTime2').textContent = peakT ? utils.fmtTime(peakT) + ' น.' : '—';
      document.getElementById('s-avgW').textContent      = Math.round(avgW).toLocaleString('th-TH') + ' W';
      document.getElementById('s-minW').textContent      = Math.round(minW).toLocaleString('th-TH') + ' W';
    } else {
      utils.setText('s-todayKwh', '—');
      utils.setText('s-peakW',    Math.round(latest.w || 0).toLocaleString('th-TH'));
      document.getElementById('s-peakTime').textContent  = 'ล่าสุด';
      document.getElementById('s-avgW').textContent      = '—';
      document.getElementById('s-minW').textContent      = '—';
    }

    document.getElementById('s-monthKwh').textContent
      = mkwh.toFixed(1);
    document.getElementById('s-monthBaht').textContent
      = utils.calcProgressiveTariff(mkwh).toLocaleString('th-TH');
    document.getElementById('s-recCount').textContent
      = allRows.length.toLocaleString('th-TH') + ' รายการ';
    document.getElementById('s-lastTs').textContent = utils.fmtFull(latest.time);
    document.getElementById('s-pf').textContent = latest.pf != null ? latest.pf.toFixed(3) : '—';
    document.getElementById('s-hz').textContent = latest.hz != null ? latest.hz.toFixed(2) + ' Hz' : '—';
    document.getElementById('s-v').textContent  = latest.v  != null ? latest.v.toFixed(1)  + ' V' : '—';
    document.getElementById('s-a').textContent  = latest.a  != null ? latest.a.toFixed(3)  + ' A' : '—';
  },

  startClock() {
    const tick = () => {
      const n = new Date();
      document.getElementById('clock').textContent
        = utils.pad(n.getHours()) + ':' + utils.pad(n.getMinutes());
    };
    tick();
    setInterval(tick, 1000);
  },

  startStaleTicker(getLatestTime) {
    setInterval(() => this.updateStaleBadge(getLatestTime()), 60_000);
  },

  /* ── Notification Bell ── */

  updateNotifBell(permission) {
    const btn = document.getElementById('notif-bell');
    if (!btn) return;
    if (permission === 'granted') {
      btn.textContent = '🔔';
      btn.classList.add('notif-active');
      btn.title = 'การแจ้งเตือนเปิดอยู่';
    } else if (permission === 'denied') {
      btn.textContent = '🔕';
      btn.classList.remove('notif-active');
      btn.title = 'การแจ้งเตือนถูกบล็อก';
    } else {
      btn.textContent = '🔔';
      btn.classList.remove('notif-active');
      btn.title = 'แตะเพื่อเปิดการแจ้งเตือน';
    }
  },

  initNotifBell() {
    if (!('Notification' in window)) {
      const btn = document.getElementById('notif-bell');
      if (btn) btn.style.display = 'none';
      return;
    }
    this.updateNotifBell(Notification.permission);
  },

};
