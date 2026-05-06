/**
 * cache.js — localStorage wrapper for CSV data
 */

const cache = {

  KEY_DATA: 'lm_csv_v1',
  KEY_TS:   'lm_csv_ts_v1',

  save(csvText) {
    try {
      localStorage.setItem(this.KEY_DATA, csvText);
      localStorage.setItem(this.KEY_TS, Date.now());
    } catch (e) {
      console.warn('[cache] save failed:', e);
    }
  },

  load() {
    try {
      return {
        text: localStorage.getItem(this.KEY_DATA),
        ts:   parseInt(localStorage.getItem(this.KEY_TS) || '0'),
      };
    } catch (e) {
      return { text: null, ts: 0 };
    }
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY_DATA);
      localStorage.removeItem(this.KEY_TS);
    } catch (e) { /* ignore */ }
  },

};
