// 智能分析相关类型定义

// K线数据结构
export interface KLineData {
  date: string;           // 日期 YYYY-MM-DD
  open: number;           // 开盘价
  close: number;          // 收盘价
  high: number;           // 最高价
  low: number;            // 最低价
  volume: number;         // 成交量（手）
  amount: number;         // 成交额（万元）
  changePercent: number;  // 涨跌幅%
}

// MACD 指标结果
export interface MACDResult {
  dif: number[];          // DIF 线
  dea: number[];          // DEA 线
  macd: number[];         // MACD 柱
  signal: 'bullish' | 'bearish' | 'neutral';  // 信号：多头/空头/中性
  signalStrength: number; // 信号强度 0-100
}

// RSI 指标结果
export interface RSIResult {
  values: number[];       // RSI 值序列
  current: number;        // 当前 RSI
  signal: 'overbought' | 'oversold' | 'neutral';  // 超买/超卖/中性
  signalStrength: number;
}

// KDJ 指标结果
export interface KDJResult {
  k: number[];            // K 值序列
  d: number[];            // D 值序列
  j: number[];            // J 值序列
  currentK: number;
  currentD: number;
  currentJ: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
}

// 技术指标综合结果
export interface TechnicalIndicatorsResult {
  macd: MACDResult;
  rsi: RSIResult;
  kdj: KDJResult;
}

// 新闻数据
export interface StockNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishTime: string;
  url: string;
  sentiment?: 'positive' | 'negative' | 'neutral';  // AI 情感标签
  sentimentScore?: number;  // 情感分数 -1 到 1
}

// 股票基本面数据
export interface StockFundamentals {
  pe: number | null;        // 市盈率
  pb: number | null;        // 市净率
  roe: number | null;       // 净资产收益率（%）
  totalMarketValue: number | null;  // 总市值（亿）
  circulatingMarketValue: number | null;  // 流通市值（亿）
  eps: number | null;       // 每股收益
  bvps: number | null;      // 每股净资产
}

// 分析请求参数
export interface AnalysisRequest {
  stockCode: string;
  stockName?: string;
  klinePeriod?: 'day' | 'week' | 'month';  // K线周期
  klineCount?: number;  // K线数量，默认 60
  includeNews?: boolean;  // 是否包含新闻
}

// AI 分析输入数据
export interface AIAnalysisInput {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  changePercent: number;
  klineData: KLineData[];
  indicators: TechnicalIndicatorsResult;
  news: StockNews[];
  pe: number | null;
  pb: number | null;
  roe: number | null;
}