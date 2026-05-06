/**
 * app.js — Main application controller
 *
 * Coordinates: data fetching, reconnect logic,
 * network events, view navigation, and UI rendering.
 */

const app = {

  currentNav:       'home',
  currentElecView:  'today',
  currentGraphView: 'today',

  isOnline:    navigator.onLine,
  isFirstLoad: true,
  retryCount:  0,

  _pollTimer:       null,
  _retryTimer:      null,
  _retryCountdown:  null,
  _retryCountdownVal: 0,

  /* ── Bootstrap ────────────────────────────────── */

  init() {
    ui.startClock();
    ui.startStaleTicker(() => data.rows.length ? data.rows[data.rows.length - 1].time : null);
    this._bindNetworkEvents();
    this.fetchData();
  },

  /* ── Network Events ───────────────────────────── */

  _bindNetworkEvents() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      document.getElementById('net-icon').textContent = '●●●';
      document.getElementById('net-label').textContent = 'WiFi';
      this._clearRetry();
      this.retryCount = 0;
      ui.setRetryInfo('');
      this.fetchData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      document.getElementById('net-icon').textContent = '⊗⊗⊗';
      document.getElementById('net-label').textContent = 'Offline';
      clearTimeout(this._pollTimer);
      ui.setStatus('offline', 'Offline — ไม่มีสัญญาณ');
      this._loadCacheIfNeeded();
      this._scheduleRetry();
    });
  },

  /* ── Fetch Cycle ──────────────────────────────── */

  async fetchData() {
    clearTimeout(this._pollTimer);

    if (!this.isOnline) {
      ui.setStatus('offline', 'Offline — ไม่มีสัญญาณ');
      this._loadCacheIfNeeded();
      this._scheduleRetry();
      return;
    }

    ui.setStatus(
      this.isFirstLoad ? 'loading' : 'reconnecting',
      this.isFirstLoad ? 'กำลังโหลด...' : 'กำลังอัปเดต...',
    );

    try {
      await data.fetch();
      this._onFetchSuccess(false);
    } catch (e) {
      console.warn('[app] fetch failed:', e.message);
      ui.setStatus('offline', 'โหลดไม่สำเร็จ — แตะเพื่อลองใหม่');
      this._loadCacheIfNeeded();
      this._scheduleRetry();
    }
  },

  _onFetchSuccess(fromCache) {
    this.retryCount = 0;
    this.isFirstLoad = false;
    this._clearRetry();
    ui.setRetryInfo('');
    this._renderAll(fromCache);
    this._pollTimer = setTimeout(() => this.fetchData(), CONFIG.POLL_INTERVAL_MS);
  },

  /* ── Rendering ────────────────────────────────── */

  _renderAll(fromCache) {
    const todayRows = data.todayRows();

    ui.renderHome(data.rows, todayRows, fromCache);
    ui.renderStats(data.rows, todayRows);
    charts.renderHome(data.rows, todayRows, this.currentElecView);

    if (this.currentNav === 'graph') {
      this._renderGraphCharts();
    }
  },

  _renderGraphCharts() {
    const todayRows = data.todayRows();
    charts.renderGraph(data.rows, todayRows, this.currentGraphView);
    charts.renderVolt(todayRows);
    charts.renderAmp(todayRows);
  },

  /* ── View Navigation ──────────────────────────── */

  switchView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.getElementById('nav-'  + name).classList.add('active');
    this.currentNav = name;

    if (name === 'weather' && !weather.fetched) {
      weather.fetch();
    }

    if (name === 'graph' && data.rows.length) {
      setTimeout(() => this._renderGraphCharts(), 50);
    }
  },

  /* ── Segment Controls ─────────────────────────── */

  setElecView(view, btn) {
    this.currentElecView = view;
    document.querySelectorAll('#view-home .seg').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    charts.renderHome(data.rows, data.todayRows(), view);
  },

  setGraphView(view, btn) {
    this.currentGraphView = view;
    document.querySelectorAll('#view-graph .seg').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    charts.renderGraph(data.rows, data.todayRows(), view);
  },

  /* ── Manual Retry (tap pill) ──────────────────── */

  manualRetry() {
    this._clearRetry();
    this.retryCount = 0;
    ui.setRetryInfo('');
    this.fetchData();
  },

  /* ── Cache Fallback ───────────────────────────── */

  _loadCacheIfNeeded() {
    if (data.rows.length) return; // already have data
    const { text } = cache.load();
    if (!text) return;
    try {
      data.parse(text);
      this._renderAll(true);
    } catch (e) {
      console.warn('[app] cache parse failed:', e.message);
    }
  },

  /* ── Retry / Backoff ──────────────────────────── */

  _scheduleRetry() {
    this._clearRetry();
    const delay = CONFIG.RETRY_DELAYS_MS[Math.min(this.retryCount, CONFIG.RETRY_DELAYS_MS.length - 1)];
    this._retryCountdownVal = Math.round(delay / 1000);
    ui.setRetryInfo('ลองใหม่ใน ' + this._retryCountdownVal + 's');

    this._retryCountdown = setInterval(() => {
      this._retryCountdownVal--;
      if (this._retryCountdownVal > 0) {
        ui.setRetryInfo('ลองใหม่ใน ' + this._retryCountdownVal + 's');
      } else {
        clearInterval(this._retryCountdown);
        ui.setRetryInfo('');
      }
    }, 1000);

    this._retryTimer = setTimeout(() => {
      this.retryCount++;
      this.fetchData();
    }, delay);
  },

  _clearRetry() {
    clearTimeout(this._retryTimer);
    clearInterval(this._retryCountdown);
  },

};

/* ── Start app when DOM is ready ── */
document.addEventListener('DOMContentLoaded', () => app.init());
