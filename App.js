/* ══════════════════════════════════════
   SignalXPro — app.js
   UI logic: chart rendering, signals,
   licence flow, timers, stats
══════════════════════════════════════ */

// ── App State ──
let selectedPair = 'EUR/USD';
let selectedTF   = '1m';
let signalHistory = [];
let wins = 0, losses = 0;
let timerInterval = null;
let timerSeconds  = 60;
let analyzing     = false;
let accList       = [];

// ══════════════════════════════════════
// LICENCE SYSTEM
// ══════════════════════════════════════

function formatKey(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let out = '';
  for (let i = 0; i < val.length && i < 16; i++) {
    if (i > 0 && i % 4 === 0) out += '-';
    out += val[i];
  }
  input.value = out;
}

function checkLicence() {
  const key    = document.getElementById('lic-input').value;
  const errEl  = document.getElementById('lic-error');
  const result = validateKey(key);  // from backend.js

  if (!key.trim()) {
    errEl.textContent = '⚠️ Key enter karein';
    return;
  }

  if (result) {
    document.getElementById('user-label').textContent = result.user + ' · ' + result.plan;
    document.getElementById('licence-overlay').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    errEl.textContent = '';
    initApp();
  } else {
    errEl.textContent = '❌ Invalid licence key. Dobara check karein.';
    const inp = document.getElementById('lic-input');
    inp.style.borderColor = '#ef4444';
    setTimeout(() => { inp.style.borderColor = ''; }, 2000);
  }
}

function logout() {
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('licence-overlay').style.display = 'flex';
  document.getElementById('lic-input').value = '';
  document.getElementById('lic-error').textContent = '';
  clearInterval(timerInterval);
  wins = 0; losses = 0; signalHistory = []; accList = [];
  resetSignalBox();
}

// ══════════════════════════════════════
// APP INIT
// ══════════════════════════════════════

function initApp() {
  renderPairs('forex-list',  PAIRS.forex);
  renderPairs('crypto-list', PAIRS.crypto);
  renderPairs('otc-list',    PAIRS.otc);
  setTimeout(drawChart, 80);
  startPriceTicker(() => {
    document.getElementById('chart-price').textContent =
      formatPrice(selectedPair, LIVE_PRICES[selectedPair]);
  });
  setInterval(updateClock, 1000);
  updateClock();
}

// ══════════════════════════════════════
// PAIR RENDERING
// ══════════════════════════════════════

function renderPairs(listId, arr) {
  const el = document.getElementById(listId);
  el.innerHTML = '';
  arr.forEach(p => {
    const change = (Math.random() * 0.8 - 0.4).toFixed(2);
    const isUp   = parseFloat(change) >= 0;
    const color  = isUp ? '#10b981' : '#ef4444';
    el.innerHTML += `
      <button class="pair-btn${p === selectedPair ? ' active' : ''}"
        onclick="selectPair('${p}')" data-pair="${p}">
        <span class="pair-name">${p}</span>
        <span style="font-size:11px;color:${color}">${isUp ? '+' : ''}${change}%</span>
      </button>`;
  });
}

function selectPair(pair) {
  selectedPair = pair;
  document.querySelectorAll('.pair-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.pair === pair));
  document.getElementById('chart-pair').textContent  = pair;
  document.getElementById('chart-price').textContent = formatPrice(pair, LIVE_PRICES[pair]);
  document.getElementById('chart-spread').textContent = 'Spread: ' + SPREADS[pair] + ' pips';
  resetSignalBox();
  drawChart();
}

// ══════════════════════════════════════
// TIMEFRAME BUTTONS
// ══════════════════════════════════════

document.querySelectorAll('.tf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTF = btn.dataset.tf;
    document.getElementById('chart-tf').textContent = selectedTF;
    resetSignalBox();
    drawChart();
  });
});

// ══════════════════════════════════════
// CHART RENDERER (Canvas Candlesticks)
// ══════════════════════════════════════

function drawChart() {
  const canvas = document.getElementById('candleChart');
  const dpr    = window.devicePixelRatio || 1;
  canvas.style.width  = '100%';
  canvas.style.height = '190px';
  canvas.width  = canvas.offsetWidth * dpr;
  canvas.height = 190 * dpr;

  const ctx     = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = canvas.offsetWidth, H = 190;

  const candles = generateCandles(52, LIVE_PRICES[selectedPair]);
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const padT = 15, padB = 15;
  const chartH = H - padT - padB;
  const colW   = W / candles.length;
  const bodyW  = colW * 0.55;
  const toY    = p => padT + (1 - (p - minP) / (maxP - minP)) * chartH;

  // Background
  ctx.fillStyle = '#08060f';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(124,58,237,0.07)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0,   padT + chartH * (i / 4));
    ctx.lineTo(W,   padT + chartH * (i / 4));
    ctx.stroke();
  }

  // Candles
  candles.forEach((c, i) => {
    const x   = i * colW + colW / 2;
    const oY  = toY(c.open);
    const cY  = toY(c.close);
    const hY  = toY(c.high);
    const lY  = toY(c.low);
    const up  = c.close >= c.open;

    // Wick
    ctx.strokeStyle = up ? '#10b981' : '#ef4444';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, hY);
    ctx.lineTo(x, lY);
    ctx.stroke();

    // Body
    ctx.fillStyle = up ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.82)';
    const bTop = Math.min(oY, cY);
    const bH   = Math.max(Math.abs(oY - cY), 2);
    ctx.fillRect(x - bodyW / 2, bTop, bodyW, bH);
  });

  // Last price line
  const lastY = toY(candles[candles.length - 1].close);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = 'rgba(124,58,237,0.65)';
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, lastY);
  ctx.lineTo(W, lastY);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ══════════════════════════════════════
// SIGNAL GENERATOR
// ══════════════════════════════════════

function generateSignal() {
  if (analyzing) return;
  analyzing = true;
  document.getElementById('gen-btn').disabled = true;
  document.getElementById('analyzing-row').style.display = 'flex';
  clearIndicators();

  const delay = 1800 + Math.random() * 1200;

  setTimeout(() => {
    analyzing = false;
    document.getElementById('gen-btn').disabled  = false;
    document.getElementById('analyzing-row').style.display = 'none';

    // Get indicators from backend
    const indicators = runIndicators(selectedPair);
    let buyCount = 0, sellCount = 0;

    indicators.forEach(ind => {
      const badge =
        ind.sig === 'buy'  ? `<span class="badge-buy">BUY</span>` :
        ind.sig === 'sell' ? `<span class="badge-sell">SELL</span>` :
                             `<span class="badge-neu">NEUTRAL</span>`;
      document.getElementById(ind.id).innerHTML = ind.val + badge;
      if (ind.sig === 'buy')  buyCount++;
      if (ind.sig === 'sell') sellCount++;
    });

    const isBuy = buyCount >= sellCount;
    const conf  = 60 + Math.floor(Math.random() * 36);
    const cc    = conf >= 85 ? 'cf-high' : conf >= 70 ? 'cf-med' : 'cf-low';

    // Overall signal
    document.getElementById('ovr-v').innerHTML =
      (isBuy ? 'BUY' : 'SELL') +
      (isBuy
        ? `<span class="badge-buy">STRONG BUY</span>`
        : `<span class="badge-sell">STRONG SELL</span>`);

    // Signal box
    const box = document.getElementById('sig-box');
    box.className = `sig-box ${isBuy ? 'sig-up' : 'sig-down'}`;
    document.getElementById('sig-icon').textContent  = isBuy ? '⬆️' : '⬇️';
    document.getElementById('sig-label').textContent = isBuy ? 'CALL (UP)' : 'PUT (DOWN)';
    document.getElementById('sig-sub').textContent   =
      `${selectedPair} • ${selectedTF} • ${buyCount}/${indicators.length} indicators confirm`;
    document.getElementById('sig-conf').textContent  = `${conf}% confidence`;
    document.getElementById('sig-conf').className    = `sig-conf ${cc}`;

    // Patterns from backend
    const patterns = detectPatterns(isBuy);
    document.getElementById('patterns-area').innerHTML =
      patterns.map(p => `<span class="ptag">${p}</span>`).join('');

    // Global accuracy
    accList.push(conf);
    const avg = Math.round(accList.reduce((a, b) => a + b, 0) / accList.length);
    document.getElementById('global-acc').textContent = avg + '%';

    // Simulate outcome
    const outcome = Math.random() < (conf / 100) ? 'win' : 'loss';
    if (outcome === 'win') wins++; else losses++;
    const total = wins + losses;
    const wr    = total > 0 ? Math.round((wins / total) * 100) : 0;

    document.getElementById('s-win').textContent = wins;
    document.getElementById('s-los').textContent = losses;
    document.getElementById('s-tot').textContent = total;
    document.getElementById('s-wr').textContent  = wr + '%';

    // History
    signalHistory.unshift({
      pair: selectedPair, tf: selectedTF,
      dir: isBuy ? 'CALL' : 'PUT',
      conf, outcome,
      time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
    });
    if (signalHistory.length > 8) signalHistory.pop();

    document.getElementById('history-list').innerHTML =
      signalHistory.map(h => `
        <div class="hist-row">
          <span style="font-weight:600;font-size:10px;width:75px">${h.pair.replace(' OTC','')}</span>
          <span style="color:${h.dir==='CALL'?'#10b981':'#ef4444'};font-weight:700;font-size:11px">${h.dir}</span>
          <span style="color:var(--muted);font-size:10px">${h.tf}</span>
          <span style="color:var(--muted);font-size:10px">${h.conf}%</span>
          <span class="hres ${h.outcome==='win'?'hw':'hl'}">${h.outcome==='win'?'WIN':'LOSS'}</span>
        </div>`).join('');

    startTimer();
    drawChart();
  }, delay);
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
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    document.getElementById('timer-v').textContent =
      `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    document.getElementById('cd-fill').style.width =
      ((timerSeconds / total) * 100).toFixed(1) + '%';
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
  document.getElementById('patterns-area').innerHTML =
    '<span class="empty-msg">Signal generate karein</span>';
  clearIndicators();
}

function clearIndicators() {
  ['rsi-v','macd-v','ma-v','ema-v','stoch-v','bb-v','adx-v','vol-v','ovr-v']
    .forEach(id => { document.getElementById(id).textContent = '--'; });
}

function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toUTCString().slice(17, 25) + ' UTC';
}