/**
 * utils.js — Helper functions
 */

const utils = {

  pad(n) {
    return String(n).padStart(2, '0');
  },

  /** "HH:MM" */
  fmtTime(d) {
    if (!d) return '—';
    return this.pad(d.getHours()) + ':' + this.pad(d.getMinutes());
  },

  /** "D/M" */
  fmtDate(d) {
    return d.getDate() + '/' + (d.getMonth() + 1);
  },

  /** "D/M HH:MM น." */
  fmtFull(d) {
    if (!d) return '—';
    return this.fmtDate(d) + ' ' + this.fmtTime(d) + ' น.';
  },

  /** Parse timestamp string → Date (supports multiple formats) */
  parseTS(s) {
    if (!s) return null;
    // ISO / default JS parse
    let d = new Date(s);
    if (!isNaN(d)) return d;
    // DD/MM/YYYY HH:MM or DD-MM-YYYY HH:MM
    const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[T ](\d{2}):(\d{2})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
    // YYYY-MM-DD HH:MM
    const m2 = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})[T ](\d{2}):(\d{2})/);
    if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3], +m2[4], +m2[5]);
    return null;
  },

  /** Animated counter: el.textContent counts from current → target */
  animateNumber(el, target, duration = 400) {
    const start = parseFloat(el.getAttribute('data-anim-val') || '0') || 0;
    const end   = parseFloat(target) || 0;
    el.setAttribute('data-anim-val', end);
    const steps = 20;
    const inc   = (end - start) / steps;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      const cur = i >= steps ? end : start + inc * i;
      el.textContent = Math.round(cur).toLocaleString('th-TH');
      if (i >= steps) clearInterval(iv);
    }, duration / steps);
  },

  /** Safely set element text (clears skeleton markup) */
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = ''; el.textContent = text; }
  },

  /** Set element innerHTML */
  setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },

  /** How long ago was `date`, in human-readable Thai */
  timeAgoTH(date) {
    const diffMin = Math.round((Date.now() - date.getTime()) / 60_000);
    if (diffMin < 1)    return 'เมื่อกี้';
    if (diffMin < 60)   return `เมื่อ ${diffMin} นาทีที่แล้ว`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    if (diffMin < 1440) return `เมื่อ ${h} ชม.${m > 0 ? ' ' + m + 'น.' : ''}ที่แล้ว`;
    const day = Math.floor(diffMin / 1440);
    return `เมื่อ ${day} วันที่แล้ว`;
  },

};
