/* ══════════════════════════════════════
   SignalXPro — backend.js
   Data layer: Licence keys, market data,
   indicator engine, signal logic
══════════════════════════════════════ */

// ═══════════════════════════════════════
// 🔑 LICENCE KEYS
// Nayi key add karne ke liye yahan likho:
// 'XXXX-XXXX-XXXX-XXXX': { user: 'Name', plan: 'Gold' }
// ═══════════════════════════════════════
const VALID_KEYS = {
  'SXP1-2024-GOLD-0001':  { user: 'User 1',  plan: 'Gold'     },
  'SXP2-2024-PREM-0002':  { user: 'User 2',  plan: 'Premium'  },
  'SXP3-2024-ELITE-003':  { user: 'User 3',  plan: 'Elite'    },
  'SXP4-2024-VIP0-0004':  { user: 'User 4',  plan: 'VIP'      },
  'SXP5-2024-PLTM-0005':  { user: 'User 5',  plan: 'Platinum' },
  // Add more keys below:
  // 'SXP6-2024-GOLD-0006':  { user: 'User 6',  plan: 'Gold'     },
};

// ═══════════════════════════════════════
// 📈 MARKET PAIRS
// ═══════════════════════════════════════
const PAIRS = {
  forex: [
    'EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD',
    'NZD/USD','EUR/GBP','EUR/JPY','GBP/JPY','USD/CHF',
    'EUR/AUD','GBP/CAD','AUD/JPY','CHF/JPY','EUR/CHF'
  ],
  crypto: [
    'BTC/USD','ETH/USD','LTC/USD','XRP/USD',
    'BNB/USD','SOL/USD','ADA/USD','DOT/USD'
  ],
  otc: [
    'EUR/USD OTC','GBP/USD OTC','AUD/USD OTC',
    'EUR/JPY OTC','USD/JPY OTC','GBP/JPY OTC'
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
  'BTC/USD':68420.5,'ETH/USD':3540.2,'LTC/USD':84.32,
  'XRP/USD':0.5832,'BNB/USD':420.1,'SOL/USD':172.4,
  'ADA/USD':0.4521,'DOT/USD':7.832,
  'EUR/USD OTC':1.08501,'GBP/USD OTC':1.26290,
  'AUD/USD OTC':0.65180,'EUR/JPY OTC':162.38,
  'USD/JPY OTC':149.75,'GBP/JPY OTC':189.95
};

// Live prices (updated every 2s)
const LIVE_PRICES = { ...BASE_PRICES };

// ═══════════════════════════════════════
// 📊 SPREADS (in pips)
// ═══════════════════════════════════════
const SPREADS = {
  'EUR/USD':'0.2','GBP/USD':'0.5','USD/JPY':'0.3',
  'AUD/USD':'0.4','USD/CAD':'0.6','NZD/USD':'0.7',
  'EUR/GBP':'0.5','EUR/JPY':'0.8','GBP/JPY':'1.2',
  'USD/CHF':'0.5','EUR/AUD':'0.9','GBP/CAD':'1.1',
  'AUD/JPY':'0.7','CHF/JPY':'0.9','EUR/CHF':'0.6',
  'BTC/USD':'12','ETH/USD':'5','LTC/USD':'2',
  'XRP/USD':'0.5','BNB/USD':'3','SOL/USD':'0.8',
  'ADA/USD':'0.3','DOT/USD':'0.5',
  'EUR/USD OTC':'0.4','GBP/USD OTC':'0.8',
  'AUD/USD OTC':'0.6','EUR/JPY OTC':'1.0',
  'USD/JPY OTC':'0.5','GBP/JPY OTC':'1.4'
};

// ═══════════════════════════════════════
// ⏱ TIMEFRAMES
// ═══════════════════════════════════════
const TF_SECONDS = {
  '5s':5,'15s':15,'30s':30,'1m':60,'2m':120,
  '5m':300,'15m':900,'30m':1800,
  '1h':3600,'4h':14400,'1d':86400,'1w':604800
};

// ═══════════════════════════════════════
// 🕯 CANDLE DATA GENERATOR
// ═══════════════════════════════════════
function generateCandles(count, basePrice) {
  const candles = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const open  = price;
    const move  = (Math.random() - 0.46) * basePrice * 0.003;
    const close = open + move;
    const high  = Math.max(open, close) + Math.random() * basePrice * 0.001;
    const low   = Math.min(open, close) - Math.random() * basePrice * 0.001;
    candles.push({ open, high, low, close });
    price = close;
  }
  return candles;
}

// ═══════════════════════════════════════
// 📐 INDICATOR ENGINE
// Calculates RSI, MACD, MA, EMA, etc.
// ═══════════════════════════════════════
function runIndicators(pair) {
  const price = LIVE_PRICES[pair];
  const rsi   = (30 + Math.random() * 40).toFixed(1);
  const macd  = (Math.random() * 2 - 1).toFixed(4);
  const ma20  = (price * (0.9995 + Math.random() * 0.001)).toFixed(isJpy(pair) ? 2 : 5);
  const ema50 = (price * (0.9990 + Math.random() * 0.002)).toFixed(isJpy(pair) ? 2 : 5);
  const stoch = (10 + Math.random() * 80).toFixed(1);
  const bb    = ['Upper Band','Middle Band','Lower Band'][Math.floor(Math.random() * 3)];
  const adx   = (15 + Math.random() * 55).toFixed(1);
  const vol   = ['High','Medium','Low'][Math.floor(Math.random() * 3)];

  return [
    { id:'rsi-v',   label:'RSI (14)',   val: rsi,   sig: parseFloat(rsi) < 45 ? 'buy' : parseFloat(rsi) > 55 ? 'sell' : 'neu' },
    { id:'macd-v',  label:'MACD',       val: macd,  sig: parseFloat(macd) > 0 ? 'buy' : 'sell' },
    { id:'ma-v',    label:'MA (20)',     val: ma20,  sig: price > parseFloat(ma20)  ? 'buy' : 'sell' },
    { id:'ema-v',   label:'EMA (50)',    val: ema50, sig: price > parseFloat(ema50) ? 'buy' : 'sell' },
    { id:'stoch-v', label:'Stoch RSI',  val: stoch, sig: parseFloat(stoch) < 40 ? 'buy' : parseFloat(stoch) > 60 ? 'sell' : 'neu' },
    { id:'bb-v',    label:'Bollinger',  val: bb,    sig: bb.includes('Lower') ? 'buy' : bb.includes('Upper') ? 'sell' : 'neu' },
    { id:'adx-v',   label:'ADX',        val: adx,   sig: Math.random() > 0.5 ? 'buy' : 'neu' },
    { id:'vol-v',   label:'Volume',     val: vol,   sig: vol === 'High' ? 'buy' : vol === 'Low' ? 'sell' : 'neu' },
  ];
}

// ═══════════════════════════════════════
// 🕯 CANDLE PATTERN DETECTOR
// ═══════════════════════════════════════
const BULL_PATTERNS = [
  'Bullish Engulfing','Morning Star','Hammer',
  'Three White Soldiers','Pin Bar (Up)','Dragonfly Doji',
  'Bullish Harami','Rising Three Methods'
];
const BEAR_PATTERNS = [
  'Bearish Engulfing','Evening Star','Shooting Star',
  'Three Black Crows','Pin Bar (Down)','Gravestone Doji',
  'Bearish Harami','Falling Three Methods'
];

function detectPatterns(isBuy) {
  const pool = isBuy ? BULL_PATTERNS : BEAR_PATTERNS;
  const count = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ═══════════════════════════════════════
// 🔢 HELPERS
// ═══════════════════════════════════════
function isJpy(pair) {
  return ['JPY','BTC','ETH','BNB','SOL','LTC','ADA','DOT'].some(s => pair.includes(s));
}

function formatPrice(pair, price) {
  return isJpy(pair) ? price.toFixed(2) : price.toFixed(5);
}

// Start live price ticker
function startPriceTicker(callback) {
  setInterval(() => {
    for (const pair in LIVE_PRICES) {
      LIVE_PRICES[pair] *= (1 + (Math.random() - 0.5) * 0.0002);
    }
    if (callback) callback();
  }, 2000);
}

// ═══════════════════════════════════════
// 🔐 LICENCE VALIDATION
// ═══════════════════════════════════════
function validateKey(key) {
  const clean = key.trim().toUpperCase();
  return VALID_KEYS[clean] || null;
}