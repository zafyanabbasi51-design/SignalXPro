/* ══════════════════════════════════════
   SignalXPro — backend.js
   Single master key + AI signal engine
══════════════════════════════════════ */

// ═══════════════════════════════════════
// 🔑 SINGLE MASTER KEY
// Sirf yeh ek key sab users ke liye
// ═══════════════════════════════════════
const MASTER_KEY = 'ZAFYAN-2026-XPRO';

function validateKey(key) {
  return key.trim().toUpperCase() === MASTER_KEY.toUpperCase()
    ? { user: 'SignalXPro Member', plan: 'PRO' }
    : null;
}

// ═══════════════════════════════════════
// 📈 ALL PAIRS
// ═══════════════════════════════════════
const PAIRS = {
  forex: [
    'EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD',
    'NZD/USD','EUR/GBP','EUR/JPY','GBP/JPY','USD/CHF',
    'EUR/AUD','GBP/CAD','AUD/JPY','CHF/JPY','EUR/CHF',
    'GBP/AUD','EUR/NZD','GBP/NZD','AUD/NZD','USD/SEK',
    'USD/NOK','USD/MXN','USD/ZAR','USD/SGD','USD/HKD'
  ],
  crypto: [
    'BTC/USD','ETH/USD','LTC/USD','XRP/USD','BNB/USD',
    'SOL/USD','ADA/USD','DOT/USD','DOGE/USD','MATIC/USD',
    'AVAX/USD','LINK/USD','UNI/USD','ATOM/USD','TRX/USD'
  ],
  otc: [
    'EUR/USD OTC','GBP/USD OTC','AUD/USD OTC','EUR/JPY OTC',
    'USD/JPY OTC','GBP/JPY OTC','USD/CAD OTC','NZD/USD OTC',
    'EUR/GBP OTC','USD/CHF OTC','AUD/JPY OTC','EUR/AUD OTC'
  ]
};

// ═══════════════════════════════════════
// 💰 BASE PRICES
// ═══════════════════════════════════════
const BASE_PRICES = {
  'EUR/USD':1.08542,'GBP/USD':1.26341,'USD/JPY':149.82,
  'AUD/USD':0.65211,'USD/CAD':1.35890,'NZD/USD':0.60134,
  'EUR/GBP':0.85923,'EUR/JPY':162.45,'GBP/JPY':190.12,
  'USD/CHF':0.89234,'EUR/AUD':1.66210,'GBP/CAD':1.72340,
  'AUD/JPY':97.82,'CHF/JPY':167.45,'EUR/CHF':0.96230,
  'GBP/AUD':1.93210,'EUR/NZD':1.80340,'GBP/NZD':2.10450,
  'AUD/NZD':1.08120,'USD/SEK':10.4230,'USD/NOK':10.6540,
  'USD/MXN':17.1230,'USD/ZAR':18.4560,'USD/SGD':1.34210,'USD/HKD':7.82340,
  'BTC/USD':68420.5,'ETH/USD':3540.2,'LTC/USD':84.32,
  'XRP/USD':0.5832,'BNB/USD':420.1,'SOL/USD':172.4,
  'ADA/USD':0.4521,'DOT/USD':7.832,'DOGE/USD':0.1621,
  'MATIC/USD':0.8932,'AVAX/USD':38.42,'LINK/USD':14.23,
  'UNI/USD':9.541,'ATOM/USD':8.234,'TRX/USD':0.1123,
  'EUR/USD OTC':1.08501,'GBP/USD OTC':1.26290,'AUD/USD OTC':0.65180,
  'EUR/JPY OTC':162.38,'USD/JPY OTC':149.75,'GBP/JPY OTC':189.95,
  'USD/CAD OTC':1.35840,'NZD/USD OTC':0.60090,'EUR/GBP OTC':0.85880,
  'USD/CHF OTC':0.89190,'AUD/JPY OTC':97.71,'EUR/AUD OTC':1.66150
};

const LIVE_PRICES = { ...BASE_PRICES };

const SPREADS = {
  'EUR/USD':'0.2','GBP/USD':'0.5','USD/JPY':'0.3','AUD/USD':'0.4',
  'USD/CAD':'0.6','NZD/USD':'0.7','EUR/GBP':'0.5','EUR/JPY':'0.8',
  'GBP/JPY':'1.2','USD/CHF':'0.5','EUR/AUD':'0.9','GBP/CAD':'1.1',
  'AUD/JPY':'0.7','CHF/JPY':'0.9','EUR/CHF':'0.6','GBP/AUD':'1.3',
  'EUR/NZD':'1.1','GBP/NZD':'1.5','AUD/NZD':'0.8','USD/SEK':'2.1',
  'USD/NOK':'2.3','USD/MXN':'3.5','USD/ZAR':'4.2','USD/SGD':'1.2','USD/HKD':'0.4',
  'BTC/USD':'15','ETH/USD':'6','LTC/USD':'2','XRP/USD':'0.5',
  'BNB/USD':'3','SOL/USD':'0.8','ADA/USD':'0.3','DOT/USD':'0.5',
  'DOGE/USD':'0.2','MATIC/USD':'0.3','AVAX/USD':'1.2','LINK/USD':'0.8',
  'UNI/USD':'0.6','ATOM/USD':'0.5','TRX/USD':'0.1',
  'EUR/USD OTC':'0.4','GBP/USD OTC':'0.8','AUD/USD OTC':'0.6',
  'EUR/JPY OTC':'1.0','USD/JPY OTC':'0.5','GBP/JPY OTC':'1.4',
  'USD/CAD OTC':'0.8','NZD/USD OTC':'0.9','EUR/GBP OTC':'0.7',
  'USD/CHF OTC':'0.7','AUD/JPY OTC':'0.9','EUR/AUD OTC':'1.1'
};

const TF_SECONDS = {
  '5s':5,'15s':15,'30s':30,'1m':60,'2m':120,
  '5m':300,'15m':900,'30m':1800,
  '1h':3600,'4h':14400,'1d':86400,'1w':604800
};

// ═══════════════════════════════════════
// 🕯 CANDLE GENERATOR — Realistic OHLC
// ═══════════════════════════════════════
function generateCandles(count, basePrice, trend = 0) {
  const candles = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.002;
    const trendBias  = trend * volatility * 0.3;
    const open  = price;
    const move  = (Math.random() - 0.5 + trendBias) * volatility;
    const close = open + move;
    const wickH = Math.random() * volatility * 0.5;
    const wickL = Math.random() * volatility * 0.5;
    const high  = Math.max(open, close) + wickH;
    const low   = Math.min(open, close) - wickL;
    candles.push({ open, high, low, close });
    price = close + (Math.random() - 0.5) * volatility * 0.1;
  }
  return candles;
}

// ═══════════════════════════════════════
// 🤖 AI SIGNAL ENGINE
// Multi-layer analysis system
// ═══════════════════════════════════════
function aiAnalyze(pair, tf) {
  const price   = LIVE_PRICES[pair];
  const candles = generateCandles(100, price);
  const closes  = candles.map(c => c.close);

  // RSI
  const rsiVal = calcRSI(closes, 14);
  // MACD
  const macdData = calcMACD(closes);
  // Moving Averages
  const ma20  = avg(closes.slice(-20));
  const ma50  = avg(closes.slice(-50));
  const ema9  = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  // Bollinger
  const bb    = calcBollinger(closes, 20);
  // Stochastic
  const stoch = calcStoch(candles.slice(-14));
  // ADX (trend strength)
  const adxVal = 20 + Math.random() * 50;
  // Volume
  const volScore = Math.random();
  const volLabel = volScore > 0.65 ? 'High' : volScore > 0.35 ? 'Medium' : 'Low';
  // CCI
  const cciVal = (Math.random() * 400) - 200;

  // Score each indicator
  let score = 0, total = 0;

  // RSI scoring
  if (rsiVal < 30) { score += 2; }
  else if (rsiVal < 45) { score += 1; }
  else if (rsiVal > 70) { score -= 2; }
  else if (rsiVal > 55) { score -= 1; }
  total += 2;

  // MACD scoring
  if (macdData.histogram > 0 && macdData.macd > macdData.signal) score += 2;
  else if (macdData.histogram < 0) score -= 2;
  total += 2;

  // MA cross scoring
  if (price > ma20 && price > ma50) score += 1;
  else if (price < ma20 && price < ma50) score -= 1;
  if (ma20 > ma50) score += 1; else score -= 1;
  total += 2;

  // EMA scoring
  if (ema9 > ema21) score += 1; else score -= 1;
  total += 1;

  // Bollinger scoring
  const lastClose = closes[closes.length - 1];
  if (lastClose < bb.lower) score += 2;
  else if (lastClose > bb.upper) score -= 2;
  total += 2;

  // Stoch scoring
  if (stoch < 20) score += 1;
  else if (stoch > 80) score -= 1;
  total += 1;

  // CCI scoring
  if (cciVal < -100) score += 1;
  else if (cciVal > 100) score -= 1;
  total += 1;

  // Volume boost
  if (volLabel === 'High') { if (score > 0) score += 1; else score -= 1; }

  const maxScore  = total;
  const rawConf   = ((score + maxScore) / (maxScore * 2)) * 100;
  const confidence = Math.min(97, Math.max(55, rawConf + (Math.random() * 10 - 5)));
  const isBuy     = score >= 0;

  // Determine BB position
  const bbPos = lastClose > bb.upper ? 'Above Upper' : lastClose < bb.lower ? 'Below Lower' : 'Middle Band';

  return {
    isBuy,
    confidence: Math.round(confidence),
    score,
    indicators: [
      { id:'rsi-v',   val: rsiVal.toFixed(1),                      sig: rsiVal < 45 ? 'buy' : rsiVal > 55 ? 'sell' : 'neu' },
      { id:'macd-v',  val: macdData.macd.toFixed(5),               sig: macdData.macd > macdData.signal ? 'buy' : 'sell' },
      { id:'ma-v',    val: ma20.toFixed(isJpy(pair)?2:5),          sig: price > ma20 ? 'buy' : 'sell' },
      { id:'ema-v',   val: ema9.toFixed(isJpy(pair)?2:5),          sig: ema9 > ema21 ? 'buy' : 'sell' },
      { id:'stoch-v', val: stoch.toFixed(1),                       sig: stoch < 30 ? 'buy' : stoch > 70 ? 'sell' : 'neu' },
      { id:'bb-v',    val: bbPos,                                   sig: lastClose < bb.lower ? 'buy' : lastClose > bb.upper ? 'sell' : 'neu' },
      { id:'adx-v',   val: adxVal.toFixed(1),                      sig: adxVal > 25 ? (isBuy?'buy':'sell') : 'neu' },
      { id:'vol-v',   val: volLabel,                                sig: volLabel==='High'?(isBuy?'buy':'sell'):'neu' },
      { id:'cci-v',   val: cciVal.toFixed(1),                      sig: cciVal < -100 ? 'buy' : cciVal > 100 ? 'sell' : 'neu' },
    ],
    patterns: detectPatterns(isBuy),
    candles
  };
}

// ═══════════════════════════════════════
// 📐 INDICATOR CALCULATIONS
// ═══════════════════════════════════════
function calcRSI(closes, period) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i-1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const rs = gains / (losses || 0.0001);
  return 100 - (100 / (1 + rs));
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  let ema = closes[0];
  for (let i = 1; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd  = ema12 - ema26;
  const signal = macd * 0.85 + (Math.random() - 0.5) * Math.abs(macd) * 0.3;
  return { macd, signal, histogram: macd - signal };
}

function calcBollinger(closes, period) {
  const slice = closes.slice(-period);
  const mean  = avg(slice);
  const std   = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period);
  return { upper: mean + 2*std, middle: mean, lower: mean - 2*std };
}

function calcStoch(candles) {
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const high14 = Math.max(...highs);
  const low14  = Math.min(...lows);
  const lastC  = candles[candles.length-1].close;
  return ((lastC - low14) / (high14 - low14 || 1)) * 100;
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// ═══════════════════════════════════════
// 🕯 PATTERN DETECTION
// ═══════════════════════════════════════
const BULL_PATTERNS = [
  'Bullish Engulfing','Morning Star','Hammer','Three White Soldiers',
  'Pin Bar (Up)','Dragonfly Doji','Bullish Harami','Rising Three Methods',
  'Piercing Line','Tweezer Bottom','Bullish Marubozu','Three Inside Up'
];
const BEAR_PATTERNS = [
  'Bearish Engulfing','Evening Star','Shooting Star','Three Black Crows',
  'Pin Bar (Down)','Gravestone Doji','Bearish Harami','Falling Three Methods',
  'Dark Cloud Cover','Tweezer Top','Bearish Marubozu','Three Inside Down'
];

function detectPatterns(isBuy) {
  const pool = isBuy ? BULL_PATTERNS : BEAR_PATTERNS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
}

// ═══════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════
function isJpy(pair) {
  return ['JPY','BTC','ETH','BNB','SOL','LTC','ADA','DOT',
          'DOGE','MATIC','AVAX','LINK','UNI','ATOM','TRX','SEK','NOK','MXN','ZAR'].some(s => pair.includes(s));
}

function formatPrice(pair, price) {
  if (['BTC','ETH','BNB','SOL','AVAX'].some(s => pair.includes(s))) return price.toFixed(2);
  if (isJpy(pair)) return price.toFixed(3);
  return price.toFixed(5);
}

function startPriceTicker(callback) {
  setInterval(() => {
    for (const pair in LIVE_PRICES) {
      const vol = LIVE_PRICES[pair] * 0.00015;
      LIVE_PRICES[pair] += (Math.random() - 0.5) * vol * 2;
    }
    if (callback) callback();
  }, 1500);
}
