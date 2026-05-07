const cache = {

  _key(houseId)   { return 'lm_csv_'  + houseId; },
  _tsKey(houseId) { return 'lm_ts_'   + houseId; },

  save(houseId, csvText) {
    try {
      localStorage.setItem(this._key(houseId),   csvText);
      localStorage.setItem(this._tsKey(houseId), Date.now());
    } catch (e) {
      console.warn('[cache] save failed:', e);
    }
  },

  load(houseId) {
    try {
      return {
        text: localStorage.getItem(this._key(houseId)),
        ts:   parseInt(localStorage.getItem(this._tsKey(houseId)) || '0'),
      };
    } catch (e) {
      return { text: null, ts: 0 };
    }
  },

  clear(houseId) {
    try {
      localStorage.removeItem(this._key(houseId));
      localStorage.removeItem(this._tsKey(houseId));
    } catch (e) {}
  },

};