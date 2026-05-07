const app = {

  currentNav:       'home',
  currentElecView:  'today',
  currentGraphView: 'today',
  currentHouseIdx:  0,// ← บ้านที่เลือกอยู่
  currentHomeChart: 'watt',

  isOnline:    navigator.onLine,
  isFirstLoad: true,
  retryCount:  0,

  _pollTimer:         null,
  _retryTimer:        null,
  _retryCountdown:    null,
  _retryCountdownVal: 0,

  init() {
    ui.startClock();
    ui.buildHouseTabs(CONFIG.HOUSES, (idx) => this.selectHouse(idx));
    ui.startStaleTicker(() => data.rows.length ? data.rows[data.rows.length - 1].time : null);
    this._bindNetworkEvents();
    this.fetchData();
  },

  house() {
    return CONFIG.HOUSES[this.currentHouseIdx];
  },

  selectHouse(idx) {
    if (idx === this.currentHouseIdx) return; // กันกด tab เดิมซ้ำ
    this.currentHouseIdx = idx;
    this.isFirstLoad     = true;
    data.rows            = [];
    ui.setActiveHouseTab(idx);
    this._clearRetry();
    clearTimeout(this._pollTimer);

    // แสดง skeleton ก่อน fetch
    ui.setStatus('loading', 'กำลังโหลด...');
    document.getElementById('wattVal').innerHTML = '<span class="sk sk-big"></span>';
    document.getElementById('wattUnit').style.opacity = '0';
    document.getElementById('todayKwh').innerHTML = '<span class="sk sk-card"></span>';
    document.getElementById('monthKwh').innerHTML = '<span class="sk sk-card"></span>';
    document.getElementById('peakVal').innerHTML  = '<span class="sk sk-card"></span>';

    this.fetchData();
  },

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
      await data.fetch(this.house().CSV_URL, this.house().id);
      this._onFetchSuccess(false);
    } catch (e) {
      ui.setStatus('offline', 'โหลดไม่สำเร็จ — แตะเพื่อลองใหม่');
      this._loadCacheIfNeeded();
      this._scheduleRetry();
    }
  },

  _onFetchSuccess(fromCache) {
    this.retryCount  = 0;
    this.isFirstLoad = false;
    this._clearRetry();
    ui.setRetryInfo('');
    this._renderAll(fromCache);
    this._pollTimer = setTimeout(() => this.fetchData(), this.house().POLL_INTERVAL_MS || CONFIG.POLL_INTERVAL_MS);
  },

  _renderAll(fromCache) {
    const h         = this.house();
    const todayRows = data.todayRows();
    ui.renderHome(data.rows, todayRows, fromCache, h);
    ui.renderStats(data.rows, todayRows, h);
    charts.renderHome(data.rows, todayRows, this.currentElecView, this.currentHomeChart || 'watt');
    if (this.currentNav === 'graph') this._renderGraphCharts();
  },

  _renderGraphCharts() {
    const todayRows = data.todayRows();
    charts.renderGraph(data.rows, todayRows, this.currentGraphView);
    charts.renderVolt(todayRows);
    charts.renderAmp(todayRows);
  },

  switchView(name) {
    // reset phone background เมื่อออกจาก weather
    if (this.currentNav === 'weather' && name !== 'weather') {
      document.querySelector('.phone').style.background = '#1c1c1e';
    }
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    document.getElementById('nav-'  + name).classList.add('active');
    this.currentNav = name;
    if (name === 'weather' && !weather.fetched) weather.fetch();
    if (name === 'graph' && data.rows.length) setTimeout(() => this._renderGraphCharts(), 50);
  },

  setElecView(view, btn) {
    this.currentElecView = view;
    document.querySelectorAll('#view-home .seg').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    charts.renderHome(data.rows, data.todayRows(), view, this.currentHomeChart || 'watt');
  },

  setGraphView(view, btn) {
    this.currentGraphView = view;
    document.querySelectorAll('#view-graph .seg').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    charts.renderGraph(data.rows, data.todayRows(), view);
  },

  manualRetry() {
    this._clearRetry();
    this.retryCount = 0;
    ui.setRetryInfo('');
    this.fetchData();
  },

  _loadCacheIfNeeded() {
    if (data.rows.length) return;
    const { text } = cache.load(this.house().id);
    if (!text) return;
    try { data.parse(text); this._renderAll(true); } catch (e) {}
  },

  _scheduleRetry() {
    this._clearRetry();
    const delay = CONFIG.RETRY_DELAYS_MS[Math.min(this.retryCount, CONFIG.RETRY_DELAYS_MS.length - 1)];
    this._retryCountdownVal = Math.round(delay / 1000);
    ui.setRetryInfo('ลองใหม่ใน ' + this._retryCountdownVal + 's');
    this._retryCountdown = setInterval(() => {
      this._retryCountdownVal--;
      if (this._retryCountdownVal > 0) ui.setRetryInfo('ลองใหม่ใน ' + this._retryCountdownVal + 's');
      else { clearInterval(this._retryCountdown); ui.setRetryInfo(''); }
    }, 1000);
    this._retryTimer = setTimeout(() => { this.retryCount++; this.fetchData(); }, delay);
  },

  _clearRetry() {
    clearTimeout(this._retryTimer);
    clearInterval(this._retryCountdown);
  },
setHomeChart(type, btn) {
    this.currentHomeChart = type;
    document.querySelectorAll('#view-home .seg-ctrl:first-child .seg')
      .forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const titles = { watt:'กำลังไฟ (W)', volt:'แรงดัน (V)', amp:'กระแส (A)', pf:'Power Factor' };
    document.getElementById('homeChartTitle').textContent = titles[type] || '';
    charts.renderHome(data.rows, data.todayRows(), this.currentElecView, type);
  },
};

document.addEventListener('DOMContentLoaded', () => app.init());
