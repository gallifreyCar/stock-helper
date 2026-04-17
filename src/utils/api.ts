// API 调用封装

import type { StockQuote } from '../types';
import { formatStockCode } from '../types';

const SINA_API_BASE = 'https://hq.sinajs.cn/list=';

// 解析新浪财经返回的数据
function parseSinaData(data: string, code: string): StockQuote | null {
  const match = data.match(/="([^"]+)"/);
  if (!match) return null;

  const parts = match[1].split(',');
  if (parts.length < 32) return null;

  const name = parts[0];
  const open = parseFloat(parts[1]) || 0;
  const preClose = parseFloat(parts[2]) || 0;
  const price = parseFloat(parts[3]) || 0;
  const high = parseFloat(parts[4]) || 0;
  const low = parseFloat(parts[5]) || 0;
  const volume = parseFloat(parts[8]) || 0; // 成交量（手）
  const amount = parseFloat(parts[9]) || 0; // 成交额（万元）
  const date = parts[30];
  const time = parts[31];

  const change = price - preClose;
  const changePercent = preClose > 0 ? (change / preClose) * 100 : 0;

  return {
    code,
    name,
    price,
    open,
    preClose,
    high,
    low,
    volume,
    amount,
    change,
    changePercent,
    time: `${date} ${time}`,
  };
}

// 获取单只股票行情
export async function fetchStockQuote(code: string): Promise<StockQuote | null> {
  try {
    const fullCode = formatStockCode(code);
    const url = `${SINA_API_BASE}${fullCode}`;

    // 使用代理解决跨域问题
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    const text = await response.text();

    return parseSinaData(text, code);
  } catch (e) {
    console.error(`Failed to fetch stock quote for ${code}:`, e);
    return null;
  }
}

// 批量获取股票行情
export async function fetchStockQuotes(codes: string[]): Promise<StockQuote[]> {
  if (codes.length === 0) return [];

  try {
    const fullCodes = codes.map(formatStockCode);
    const url = `${SINA_API_BASE}${fullCodes.join(',')}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    const text = await response.text();

    // 新浪返回多行，每行一个股票
    const lines = text.split('\n').filter(line => line.trim());
    const quotes: StockQuote[] = [];

    for (const line of lines) {
      const codeMatch = line.match(/hq_str_(sh|sz)(\d+)/);
      if (codeMatch) {
        const code = codeMatch[2];
        const quote = parseSinaData(line, code);
        if (quote) quotes.push(quote);
      }
    }

    return quotes;
  } catch (e) {
    console.error('Failed to fetch stock quotes:', e);
    return [];
  }
}

// 获取基金净值（天天基金）
export async function fetchFundNav(code: string): Promise<{
  nav: number;
  name: string;
  date: string;
} | null> {
  try {
    const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    const text = await response.text();

    // 解析基金名称
    const nameMatch = text.match(/var fS_name\s*=\s*"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : '';

    // 解析净值数据
    const navMatch = text.match(/var Data_netWorthTrend\s*=\s*(\[[^\]]+\])/);
    if (navMatch) {
      const navData = JSON.parse(navMatch[1]);
      const latest = navData[navData.length - 1];
      if (latest) {
        return {
          nav: latest.y,
          name,
          date: latest.x.toString(),
        };
      }
    }

    return null;
  } catch (e) {
    console.error(`Failed to fetch fund nav for ${code}:`, e);
    return null;
  }
}

// 批量获取基金净值
export async function fetchFundNavs(codes: string[]): Promise<Map<string, {
  nav: number;
  name: string;
  date: string;
}>> {
  const result = new Map();

  // 基金API不支持批量，逐个获取
  for (const code of codes) {
    const data = await fetchFundNav(code);
    if (data) {
      result.set(code, data);
    }
  }

  return result;
}