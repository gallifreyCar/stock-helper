// 股票类型定义

export interface Stock {
  code: string;           // 股票代码，如 sh600000, sz000001
  name: string;           // 股票名称
  market: 'sh' | 'sz';    // 市场：上海/深圳
}

export interface StockQuote {
  code: string;
  name: string;
  price: number;          // 当前价格
  open: number;           // 今开
  preClose: number;       // 昨收
  high: number;           // 最高
  low: number;            // 最低
  volume: number;         // 成交量（手）
  amount: number;         // 成交额（万元）
  change: number;         // 涨跌额
  changePercent: number;  // 涨跌幅
  time: string;           // 更新时间
}

export interface StockBasic {
  code: string;
  name: string;
  industry: string;       // 所属行业
  pe: number;             // 市盈率
  pb: number;             // 市净率
  roe: number;            // ROE
  marketCap: number;      // 市值（亿）
  totalAssets: number;    // 总资产
  debtRatio: number;      // 资产负债率
}

export interface StockAnalysis {
  code: string;
  fundamentalScore: number;    // 基本面评分 0-100
  technicalScore: number;      // 技术面评分 0-100
  moneyFlowScore: number;      // 资金面评分 0-100
  totalScore: number;          // 综合评分
  suggestion: string;          // 建议：乐观/观望/谨慎
  details: {
    pePosition: string;        // PE位置描述
    pbPosition: string;
    maPosition: string;        // 均线位置
    macdSignal: string;
  };
}

// 股票代码格式化（支持股票、ETF、基金代码）
export function formatStockCode(code: string): string {
  // 上海市场：6开头股票，51/58开头ETF，50开头ETF
  if (code.startsWith('6') || code.startsWith('51') || code.startsWith('58') || code.startsWith('50')) {
    return `sh${code}`;
  }
  // 深圳市场：0/3开头股票，15/16开头ETF
  if (code.startsWith('0') || code.startsWith('3') || code.startsWith('15') || code.startsWith('16')) {
    return `sz${code}`;
  }
  // 默认根据首位判断
  return code.startsWith('6') || code.startsWith('5') ? `sh${code}` : `sz${code}`;
}

export function parseStockCode(fullCode: string): { market: 'sh' | 'sz', code: string } {
  if (fullCode.startsWith('sh')) return { market: 'sh', code: fullCode.slice(2) };
  if (fullCode.startsWith('sz')) return { market: 'sz', code: fullCode.slice(2) };
  return { market: fullCode.startsWith('6') ? 'sh' : 'sz', code: fullCode };
}