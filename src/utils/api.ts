// API 调用封装 - 使用多个备用代理

import type { StockQuote } from '../types';
import { formatStockCode } from '../types';

const SINA_API_BASE = 'https://hq.sinajs.cn/list=';

// 代理列表（按优先级）
const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => url, // 直接访问（某些情况下可行）
];

// 解析新浪财经返回的数据
function parseSinaData(data: string, code: string): StockQuote | null {
  const match = data.match(/="([^"]+)"/);
  if (!match || match[1] === '') return null;

  const parts = match[1].split(',');
  if (parts.length < 32) return null;

  const name = parts[0];
  const open = parseFloat(parts[1]) || 0;
  const preClose = parseFloat(parts[2]) || 0;
  const price = parseFloat(parts[3]) || 0;
  const high = parseFloat(parts[4]) || 0;
  const low = parseFloat(parts[5]) || 0;
  const volume = parseFloat(parts[8]) || 0;
  const amount = parseFloat(parts[9]) || 0;
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

// 带备用代理的fetch
async function fetchWithProxy(url: string): Promise<string> {
  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('error') && !text.includes('timeout')) {
          return text;
        }
      }
    } catch (e) {
      console.warn(`Proxy failed: ${proxy(url)}`);
    }
  }
  throw new Error('All proxies failed');
}

// 获取单只股票行情
export async function fetchStockQuote(code: string): Promise<StockQuote | null> {
  try {
    const fullCode = formatStockCode(code);
    const url = `${SINA_API_BASE}${fullCode}`;
    const text = await fetchWithProxy(url);
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
    const text = await fetchWithProxy(url);

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
    // 天天基金API：更简单的方式获取净值
    const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
    const text = await fetchWithProxy(url);

    // 解析格式：jsonpgz({"fundcode":"...","name":"...","jzrq":"...","dwjz":"..."})
    const jsonMatch = text.match(/jsonpgz\((\{[^}]+\})\)/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      return {
        nav: parseFloat(data.dwjz) || 0,
        name: data.name || '',
        date: data.jzrq || '',
      };
    }

    // 备用解析方式
    const navMatch = text.match(/dwjz:"([^"]+)"/);
    const nameMatch = text.match(/name:"([^"]+)"/);
    if (navMatch) {
      return {
        nav: parseFloat(navMatch[1]) || 0,
        name: nameMatch ? nameMatch[1] : '',
        date: '',
      };
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

  for (const code of codes) {
    const data = await fetchFundNav(code);
    if (data) {
      result.set(code, data);
    }
  }

  return result;
}