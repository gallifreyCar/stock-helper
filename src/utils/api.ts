// API 调用封装 - 使用腾讯财经API（更稳定）

import type { StockQuote } from '../types';
import { formatStockCode } from '../types';

const TENCENT_API_BASE = 'https://qt.gtimg.cn/q=';

// 解析腾讯财经返回的数据
function parseTencentData(data: string, code: string): StockQuote | null {
  // 腾讯格式：v_sh513130="1~国泰纳斯达克100ETF~513130~..."
  const match = data.match(/="([^"]+)"/);
  if (!match || match[1] === '') return null;

  const parts = match[1].split('~');
  if (parts.length < 45) return null;

  // 腾讯API字段顺序
  const name = parts[1];          // 名称
  const price = parseFloat(parts[3]) || 0;    // 当前价格
  const preClose = parseFloat(parts[4]) || 0; // 昨收
  const open = parseFloat(parts[5]) || 0;     // 今开
  const high = parseFloat(parts[33]) || 0;    // 最高
  const low = parseFloat(parts[34]) || 0;     // 最低
  const time = parts[35] || '';               // 时间
  const volume = parseFloat(parts[36]) || 0;  // 成交量
  const amount = parseFloat(parts[37]) || 0;  // 成交额

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
    time,
  };
}

// 带代理的fetch
async function fetchWithProxy(url: string): Promise<string> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => u, // 直接尝试（部分网络可行）
  ];

  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('error')) {
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
    // 腾讯API格式：sh600000 或 sz000001（不带下划线）
    const url = `${TENCENT_API_BASE}${fullCode}`;
    const text = await fetchWithProxy(url);
    return parseTencentData(text, code);
  } catch (e) {
    console.error(`Failed to fetch stock quote for ${code}:`, e);
    return null;
  }
}

// 批量获取股票行情
export async function fetchStockQuotes(codes: string[]): Promise<StockQuote[]> {
  if (codes.length === 0) return [];

  try {
    const queryCodes = codes.map(code => formatStockCode(code)).join(',');

    const url = `${TENCENT_API_BASE}${queryCodes}`;
    const text = await fetchWithProxy(url);

    // 腾讯返回格式：每行一个股票
    const quotes: StockQuote[] = [];
    for (const code of codes) {
      const regex = new RegExp(`v_${formatStockCode(code)}="([^"]*)"`);
      const match = text.match(regex);
      if (match) {
        const quote = parseTencentData(`="${match[1]}"`, code);
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
    // 天天基金API - 更稳定的接口
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
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

    // 备用解析
    const nameMatch = text.match(/name:"([^"]+)"/);
    const navMatch = text.match(/dwjz:"([^"]+)"/);
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