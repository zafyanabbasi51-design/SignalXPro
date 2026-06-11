/* ══════════════════════════════════════
   SignalXPro — app.js
   UI logic, chart, AI signals, auto-trade
══════════════════════════════════════ */

let selectedPair = 'EUR/USD';
let selectedTF   = '1m';
let signalHistory = [];
let wins = 0, losses = 0;
let timerInterval = null;
let timerSeconds  = 60;
let analyzing     = false;
let accList       = [];
let autoTradeOn   = false;
let autoInterval  = null;
let currentCandles = [];
let chartAnimFrame = null;
let lastSignal     = null;

// ══════════════════════════════════════
// LICENCE
// ══════════════════════════════════════
function formatKey(input) {
  input.value = input.value.toUpperCase();
}

function checkLicence() {
  const key   = document.getElementById('lic-input').value;
  const errEl = document.getElementById('lic-error');
  const res   = validateKey(key);
  if (!key.trim()) { errEl.textContent = '⚠️ Key enter karein'; return; }
  if (res) {
    document.getElementById('user-label').textContent = res.user + ' · ' + res.plan;
    document.getElementById('licence-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    errEl.textContent = '';
    initApp();
  } else {
    errEl.textContent = '❌ Invalid key. Telegram pe contact karein: @Zafyanabbasi';
    document.getElementById('lic-input').style.borderColor = '#ef4444';
    setTimeout(() => document.getElementById('lic-input').style.borderColor = '', 2000);
  }
}

function logout() {
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('licence-overlay').style.display = 'flex';
  document.getElementById('lic-input').value = '';
  document.getElementById('lic-error').textContent = '';
  clearInterval(timerInterval);
  clearInterval(autoInterval);
  if (chartAnimFrame) cancelAnimationFrame(chartAnimFrame);
  wins = 0; losses = 0; signalHistory = []; accList = [];
  autoTradeOn = false;
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
function initApp() {
  renderPairs('forex-list',  PAIRS.forex);
  renderPairs('crypto-list', PAIRS.crypto);
  renderPairs('otc-list',    PAIRS.otc);
  // Generate initial candles
  currentCandles = generateCandles(80, LIVE_PRICES[selectedPair]);
  setTimeout(() => { drawChart(); }, 80);
  // Start live ticker
  startPriceTicker(() => {
    document.getElementById('chart-price').textContent =
      formatPrice(selectedPair, LIVE_PRICES[selectedPair]);
    // Add new candle live
    appendLiveCandle();
  });
  setInterval(updateClock, 1000);
  updateClock();
}

// ══════════════════════════════════════
// LIVE CANDLE APPEND — same price feed
// ══════════════════════════════════════
function appendLiveCandle() {
  const price = LIVE_PRICES[selectedPair];
  const last  = currentCandles[currentCandles.length - 1];
  // Update last candle's close (live candle)
  if (last) {
    last.close = price;
    last.high  = Math.max(last.high, price);
    last.low   = Math.min(last.low, price);
  }
  // Every ~10 ticks add new candle
  if (Math.random() < 0.1) {
    currentCandles.push({
      open: price, high: price, low: price, close: price
    });
    if (currentCandles.length > 80) currentCandles.shift();
  }
  drawChart();
}

// ══════════════════════════════════════
// PAIR RENDERING
// ══════════════════════════════════════
function renderPairs(listId, arr) {
  const el = document.getElementById(listId);
  el.innerHTML = '';
  arr.forEach(p => {
    const change = (Math.random() * 1.2 - 0.6).toFixed(2);
    const isUp   = parseFloat(change) >= 0;
    el.innerHTML += `
      <button class="pair-btn${p === selectedPair ? ' active' : ''}"
        onclick="selectPair('${p}')" data-pair="${p}">
        <span class="pair-name">${p}</span>
        <span style="font-size:11px;color:${isUp?'#10b981':'#ef4444'}">${isUp?'+':''}${change}%</span>
      </button>`;
  });
}

function selectPair(pair) {
  selectedPair = pair;
  document.querySelectorAll('.pair-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.pair === pair));
  document.getElementById('chart-pair').textContent  = pair;
  document.getElementById('chart-price').textContent = formatPrice(pair, LIVE_PRICES[pair]);
  document.getElementById('chart-spread').textContent = 'Spread: ' + (SPREADS[pair]||'0.5') + ' pips';
  currentCandles = generateCandles(80, LIVE_PRICES[pair]);
  resetSignalBox();
  drawChart();
}

document.querySelectorAll('.tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTF = btn.dataset.tf;
    document.getElementById('chart-tf').textContent = selectedTF;
    currentCandles = generateCandles(80, LIVE_PRICES[selectedPair]);
    resetSignalBox();
    drawChart();
  });
});

// ══════════════════════════════════════
// CHART — Real-time candlestick
// ══════════════════════════════════════
function drawChart() {
  const canvas = document.getElementById('candleChart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = '100%';
  canvas.style.height = '220px';
  if (canvas.width  !== canvas.offsetWidth  * dpr ||
      canvas.height !== 220 * dpr) {
    canvas.width  = canvas.offsetWidth * dpr;
    canvas.height = 220 * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth, H = 220;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const candles = currentCandles.slice(-60);
  if (!candles.length) return;

  const allPx = candles.flatMap(c => [c.high, c.low]);
  const minP  = Math.min(...allPx), maxP = Math.max(...allPx);
  const range = maxP - minP || 0.0001;
  const padT  = 20, padB = 25;
  const chartH = H - padT - padB;
  const colW   = W / candles.length;
  const bodyW  = Math.max(colW * 0.6, 2);
  const toY    = p => padT + (1 - (p - minP) / range) * chartH;

  // Background
  ctx.fillStyle = '#08060f';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(124,58,237,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 5; i++) {
    const y = padT + chartH * (i / 5);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    // Price label
    const priceAtY = maxP - range * (i / 5);
    ctx.fillStyle = 'rgba(139,122,168,0.6)';
    ctx.font = '9px monospace';
    ctx.fillText(formatPrice(selectedPair, priceAtY), 4, y - 2);
  }

  // Volume bars (background)
  candles.forEach((c, i) => {
    const x    = i * colW;
    const isUp = c.close >= c.open;
    const vol  = Math.random() * 30 + 5;
    ctx.fillStyle = isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
    ctx.fillRect(x, H - padB - vol, colW - 1, vol);
  });

  // Candles
  candles.forEach((c, i) => {
    const x    = i * colW + colW / 2;
    const oY   = toY(c.open), cY = toY(c.close);
    const hY   = toY(c.high), lY = toY(c.low);
    const isUp = c.close >= c.open;
    const col  = isUp ? '#10b981' : '#ef4444';

    // Wick
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();

    // Body
    const bTop = Math.min(oY, cY);
    const bH   = Math.max(Math.abs(oY - cY), 1.5);
    ctx.fillStyle = isUp ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)';
    ctx.fillRect(x - bodyW / 2, bTop, bodyW, bH);
  });

  // Last price dashed line
  const lastC = candles[candles.length - 1];
  const lastY = toY(lastC.close);
  const isLastUp = lastC.close >= lastC.open;
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = isLastUp ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(W, lastY); ctx.stroke();
  ctx.setLineDash([]);

  // Price tag on right
  ctx.fillStyle = isLastUp ? '#10b981' : '#ef4444';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('▶ ' + formatPrice(selectedPair, lastC.close), W - 90, lastY - 3);

  // Signal arrow on chart
  if (lastSignal) {
    const arrowX = W - 20;
    const arrowY = lastY;
    ctx.font = '18px sans-serif';
    ctx.fillText(lastSignal === 'buy' ? '⬆' : '⬇', arrowX - 10, arrowY + 6);
  }
}

// ══════════════════════════════════════
// AI SIGNAL GENERATOR
// ══════════════════════════════════════
function generateSignal() {
  if (analyzing) return;
  analyzing = true;
  lastSignal = null;
  document.getElementById('gen-btn').disabled = true;
  document.getElementById('analyzing-row').style.display = 'flex';
  clearIndicators();

  // Show AI thinking steps
  const steps = [
    'Fetching market data...',
    'Calculating RSI & MACD...',
    'Analyzing candle patterns...',
    'Running AI confluence engine...',
    'Generating signal...'
  ];
  let si = 0;
  const stepEl = document.getElementById('ai-step');
  if (stepEl) stepEl.textContent = steps[0];
  const stepInt = setInterval(() => {
    si++;
    if (si < steps.length && stepEl) stepEl.textContent = steps[si];
  }, 400);

  setTimeout(() => {
    clearInterval(stepInt);
    analyzing = false;
    document.getElementById('gen-btn').disabled  = false;
    document.getElementById('analyzing-row').style.display = 'none';
    if (stepEl) stepEl.textContent = '';

    // Run AI backend analysis
    const result = aiAnalyze(selectedPair, selectedTF);
    const { isBuy, confidence, indicators, patterns } = result;
    lastSignal = isBuy ? 'buy' : 'sell';

    // Update indicators
    indicators.forEach(ind => {
      const el = document.getElementById(ind.id);
      if (!el) return;
      const badge =
        ind.sig === 'buy'  ? `<span class="badge-buy">BUY</span>` :
        ind.sig === 'sell' ? `<span class="badge-sell">SELL</span>` :
                             `<span class="badge-neu">NEU</span>`;
      el.innerHTML = ind.val + badge;
    });

    // Overall
    const ovrEl = document.getElementById('ovr-v');
    if (ovrEl) ovrEl.innerHTML =
      (isBuy ? 'BUY' : 'SELL') +
      (isBuy ? `<span class="badge-buy">STRONG BUY</span>` : `<span class="badge-sell">STRONG SELL</span>`);

    // AI confidence meter
    const confEl = document.getElementById('ai-confidence');
    if (confEl) {
      confEl.style.width = confidence + '%';
      confEl.style.background = confidence >= 80
        ? 'linear-gradient(90deg,#10b981,#34d399)'
        : confidence >= 65
        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
        : 'linear-gradient(90deg,#ef4444,#f87171)';
    }
    const confNum = document.getElementById('ai-conf-num');
    if (confNum) confNum.textContent = confidence + '%';

    // Signal box
    const cc = confidence >= 85 ? 'cf-high' : confidence >= 70 ? 'cf-med' : 'cf-low';
    document.getElementById('sig-box').className = `sig-box ${isBuy ? 'sig-up' : 'sig-down'}`;
    document.getElementById('sig-icon').textContent  = isBuy ? '⬆️' : '⬇️';
    document.getElementById('sig-label').textContent = isBuy ? 'CALL (UP)' : 'PUT (DOWN)';
    document.getElementById('sig-sub').textContent   =
      `${selectedPair} • ${selectedTF} • AI Confidence: ${confidence}%`;
    document.getElementById('sig-conf').textContent  = `${confidence}% — ${isBuy?'Strong Bullish':'Strong Bearish'}`;
    document.getElementById('sig-conf').className    = `sig-conf ${cc}`;

    // Patterns
    document.getElementById('patterns-area').innerHTML =
      patterns.map(p => `<span class="ptag">${p}</span>`).join('');

    // Accuracy
    accList.push(confidence);
    const avgAcc = Math.round(accList.reduce((a,b) => a+b, 0) / accList.length);
    document.getElementById('global-acc').textContent = avgAcc + '%';

    // Simulate outcome
    const outcome = Math.random() < (confidence / 100) ? 'win' : 'loss';
    if (outcome === 'win') wins++; else losses++;
    const total = wins + losses;
    document.getElementById('s-win').textContent = wins;
    document.getElementById('s-los').textContent = losses;
    document.getElementById('s-tot').textContent = total;
    document.getElementById('s-wr').textContent  = total > 0 ? Math.round(wins/total*100) + '%' : '0%';

    // History
    signalHistory.unshift({
      pair: selectedPair, tf: selectedTF,
      dir: isBuy ? 'CALL' : 'PUT',
      conf: confidence, outcome,
      time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    });
    if (signalHistory.length > 10) signalHistory.pop();

    document.getElementById('history-list').innerHTML =
      signalHistory.map(h => `
        <div class="hist-row">
          <span style="font-weight:600;font-size:10px;width:78px">${h.pair.replace(' OTC','')}</span>
          <span style="color:${h.dir==='CALL'?'#10b981':'#ef4444'};font-weight:700;font-size:11px">${h.dir}</span>
          <span style="color:var(--muted);font-size:10px">${h.tf}</span>
          <span style="color:var(--purple3);font-size:10px">${h.conf}%</span>
          <span class="hres ${h.outcome==='win'?'hw':'hl'}">${h.outcome==='win'?'✓ WIN':'✗ LOSS'}</span>
          <span style="color:var(--muted);font-size:9px">${h.time}</span>
        </div>`).join('');

    // Auto trade if on
    if (autoTradeOn) doAutoTrade(isBuy, confidence);

    startTimer();
    drawChart();
  }, 2200 + Math.random() * 800);
}

// ══════════════════════════════════════
// AUTO TRADE BOT
// ══════════════════════════════════════
function toggleAutoTrade() {
  autoTradeOn = !autoTradeOn;
  const btn = document.getElementById('auto-btn');
  const statusEl = document.getElementById('auto-status');

  if (autoTradeOn) {
    btn.textContent = '🔴 Stop Auto Trade';
    btn.style.background = 'rgba(239,68,68,0.2)';
    btn.style.borderColor = '#ef4444';
    btn.style.color = '#f87171';
    if (statusEl) statusEl.textContent = '🤖 Auto Trade: ACTIVE — Monitoring market...';
    // Auto generate every 30s
    autoInterval = setInterval(() => {
      if (!analyzing) generateSignal();
    }, 30000);
  } else {
    btn.textContent = '🤖 Start Auto Trade';
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
    if (statusEl) statusEl.textContent = '⏹ Auto Trade: OFF';
    clearInterval(autoInterval);
  }
}

function doAutoTrade(isBuy, confidence) {
  const statusEl = document.getElementById('auto-status');
  if (confidence < 70) {
    if (statusEl) statusEl.textContent = `⚠️ Auto skipped — confidence too low (${confidence}%)`;
    return;
  }
  if (statusEl) {
    statusEl.textContent = `✅ Auto Trade PLACED: ${isBuy?'CALL ⬆️':'PUT ⬇️'} on ${selectedPair} @ ${confidence}% confidence`;
    setTimeout(() => {
      if (statusEl && autoTradeOn)
        statusEl.textContent = '🤖 Auto Trade: ACTIVE — Monitoring market...';
    }, 5000);
  }
}

// ══════════════════════════════════════
// COUNTDOWN TIMER
// ══════════════════════════════════════
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerSeconds = Math.min(TF_SECONDS[selectedTF] || 60, 3600);
  const total  = timerSeconds;
  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds < 0) timerSeconds = total;
    const m = Math.floor(timerSeconds / 60), s = timerSeconds % 60;
    const tv = document.getElementById('timer-v');
    const cf = document.getElementById('cd-fill');
    if (tv) tv.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (cf) cf.style.width = ((timerSeconds / total) * 100).toFixed(1) + '%';
  }, 1000);
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function resetSignalBox() {
  document.getElementById('sig-box').className = 'sig-box sig-wait';
  document.getElementById('sig-icon').textContent  = '⏳';
  document.getElementById('sig-label').textContent = 'Waiting for Signal';
  document.getElementById('sig-sub').textContent   = 'Generate signal dabayein';
  document.getElementById('sig-conf').textContent  = '--';
  document.getElementById('sig-conf').className    = 'sig-conf cf-med';
  const pa = document.getElementById('patterns-area');
  if (pa) pa.innerHTML = '<span class="empty-msg">Signal generate karein</span>';
  clearIndicators();
  lastSignal = null;
}

function clearIndicators() {
  ['rsi-v','macd-v','ma-v','ema-v','stoch-v','bb-v','adx-v','vol-v','cci-v','ovr-v']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });
  const confEl = document.getElementById('ai-confidence');
  const confNum = document.getElementById('ai-conf-num');
  if (confEl) { confEl.style.width = '0%'; }
  if (confNum) confNum.textContent = '--%';
}

function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toUTCString().slice(17,25) + ' UTC';
}
