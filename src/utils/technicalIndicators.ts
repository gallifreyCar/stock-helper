// 技术指标计算模块
// MACD、RSI、KDJ 等常用技术指标的前端实现

import type { KLineData, TechnicalIndicatorsResult, MACDResult, RSIResult, KDJResult } from '../types/analysis';

// 计算 EMA（指数移动平均）
function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // 第一项使用 SMA（简单移动平均）
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

// 计算 SMA（简单移动平均）
function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

// 计算 MACD（12/26/9 参数）
export function calculateMACD(klineData: KLineData[]): MACDResult {
  const closes = klineData.map(d => d.close);

  if (closes.length < 26) {
    return {
      dif: [],
      dea: [],
      macd: [],
      signal: 'neutral',
      signalStrength: 0,
    };
  }

  // EMA12 和 EMA26
  const ema12Full = calculateEMA(closes, 12);
  const ema26Full = calculateEMA(closes, 26);

  // 对齐数组长度（从 EMA26 开始的位置）
  const startIdx = 26 - 12; // EMA12 比 EMA26 多出的长度
  const ema12 = ema12Full.slice(startIdx);
  const ema26 = ema26Full;

  // DIF = EMA12 - EMA26
  const dif = ema12.map((v, i) => v - ema26[i]);

  // DEA = EMA(DIF, 9)
  const dea = calculateEMA(dif, 9);

  // MACD = (DIF - DEA) * 2
  const macd = dif.slice(dea.length - dif.length).map((v, i) => (v - dea[i]) * 2);

  // 判断信号
  const lastMacd = macd[macd.length - 1] || 0;
  const prevMacd = macd[macd.length - 2] || 0;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength = 0;

  // 金叉：MACD 从负变正
  if (lastMacd > 0 && prevMacd <= 0) {
    signal = 'bullish';
    signalStrength = 85;
  }
  // 死叉：MACD 从正变负
  else if (lastMacd < 0 && prevMacd >= 0) {
    signal = 'bearish';
    signalStrength = 85;
  }
  // 多头趋势：MACD 持续为正
  else if (lastMacd > 0) {
    signal = 'bullish';
    signalStrength = Math.min(70, Math.abs(lastMacd) * 5 + 40);
  }
  // 空头趋势：MACD 持续为负
  else if (lastMacd < 0) {
    signal = 'bearish';
    signalStrength = Math.min(70, Math.abs(lastMacd) * 5 + 40);
  }

  return { dif, dea, macd, signal, signalStrength };
}

// 计算 RSI（默认 14 周期）
export function calculateRSI(klineData: KLineData[], period: number = 14): RSIResult {
  const closes = klineData.map(d => d.close);

  if (closes.length < period + 1) {
    return {
      values: [],
      current: 50,
      signal: 'neutral',
      signalStrength: 0,
    };
  }

  const values: number[] = [];

  // 计算每日涨跌
  for (let i = period; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;

    for (let j = i - period; j < i; j++) {
      const change = closes[j + 1] - closes[j];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    // RSI = 100 - 100/(1 + RS), RS = 平均涨幅/平均跌幅
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    values.push(rsi);
  }

  const current = values[values.length - 1] || 50;

  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  let signalStrength = 0;

  // RSI >= 80：严重超买
  if (current >= 80) {
    signal = 'overbought';
    signalStrength = 95;
  }
  // RSI >= 70：超买
  else if (current >= 70) {
    signal = 'overbought';
    signalStrength = 80;
  }
  // RSI <= 20：严重超卖
  else if (current <= 20) {
    signal = 'oversold';
    signalStrength = 95;
  }
  // RSI <= 30：超卖
  else if (current <= 30) {
    signal = 'oversold';
    signalStrength = 80;
  }

  return { values, current, signal, signalStrength };
}

// 计算 KDJ（默认 9 周期）
export function calculateKDJ(klineData: KLineData[], period: number = 9): KDJResult {
  if (klineData.length < period) {
    return {
      k: [],
      d: [],
      j: [],
      currentK: 50,
      currentD: 50,
      currentJ: 50,
      signal: 'neutral',
      signalStrength: 0,
    };
  }

  // 计算 RSV（未成熟随机值）
  const rsvValues: number[] = [];

  for (let i = period - 1; i < klineData.length; i++) {
    const periodData = klineData.slice(i - period + 1, i + 1);
    const highest = Math.max(...periodData.map(d => d.high));
    const lowest = Math.min(...periodData.map(d => d.low));
    const close = klineData[i].close;

    // RSV = (收盘价 - N日最低价) / (N日最高价 - N日最低价) * 100
    const rsv = highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100;
    rsvValues.push(rsv);
  }

  // K = SMA(RSV, 3)
  const k = calculateSMA(rsvValues, 3);

  // D = SMA(K, 3)
  const d = calculateSMA(k, 3);

  // J = 3K - 2D
  const j = k.map((kv, i) => {
    const dv = d[i - (d.length - k.length)] || kv;
    return 3 * kv - 2 * dv;
  });

  const currentK = k[k.length - 1] || 50;
  const currentD = d[d.length - 1] || 50;
  const currentJ = j[j.length - 1] || 50;

  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalStrength = 0;

  const prevK = k[k.length - 2] || currentK;
  const prevD = d[d.length - 2] || currentD;

  // K 线上穿 D 纨：金叉（买入信号）
  if (currentK > currentD && prevK <= prevD) {
    signal = 'bullish';
    signalStrength = 85;
  }
  // K 线下穿 D 线：死叉（卖出信号）
  else if (currentK < currentD && prevK >= prevD) {
    signal = 'bearish';
    signalStrength = 85;
  }
  // J > 100：超买
  else if (currentJ > 100) {
    signal = 'bearish';
    signalStrength = 75;
  }
  // J < 0：超卖
  else if (currentJ < 0) {
    signal = 'bullish';
    signalStrength = 75;
  }

  return {
    k,
    d,
    j,
    currentK,
    currentD,
    currentJ,
    signal,
    signalStrength,
  };
}

// 综合计算所有技术指标
export function calculateAllIndicators(klineData: KLineData[]): TechnicalIndicatorsResult {
  return {
    macd: calculateMACD(klineData),
    rsi: calculateRSI(klineData),
    kdj: calculateKDJ(klineData),
  };
}

// 获取综合技术面评分（0-100）
export function getTechnicalScore(indicators: TechnicalIndicatorsResult): number {
  const { macd, rsi, kdj } = indicators;

  let score = 50; // 基础分数

  // MACD 贡献（权重 40%）
  if (macd.signal === 'bullish') {
    score += macd.signalStrength * 0.4 * 0.5; // 最多 +20
  } else if (macd.signal === 'bearish') {
    score -= macd.signalStrength * 0.4 * 0.5; // 最多 -20
  }

  // RSI 贡献（权重 30%）
  if (rsi.signal === 'oversold') {
    score += 10; // 超卖可能反弹
  } else if (rsi.signal === 'overbought') {
    score -= 10; // 超买可能回调
  }

  // KDJ 贡献（权重 30%）
  if (kdj.signal === 'bullish') {
    score += kdj.signalStrength * 0.3 * 0.3;
  } else if (kdj.signal === 'bearish') {
    score -= kdj.signalStrength * 0.3 * 0.3;
  }

  // 限制范围
  return Math.max(0, Math.min(100, Math.round(score)));
}