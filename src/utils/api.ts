// API 调用封装 - 使用腾讯财经API（更稳定）

import type { StockQuote } from '../types';
import type { KLineData, StockNews, StockFundamentals } from '../types/analysis';
import { formatStockCode } from '../types';

const TENCENT_API_BASE = 'https://qt.gtimg.cn/q=';

// 解析腾讯财经返回的数据
function parseTencentData(data: string, code: string): StockQuote | null {
  // 腾讯格式：v_sh513130="1~恒生科技ETF华泰柏瑞~513130~..."
  const match = data.match(/="([^"]+)"/);
  if (!match || match[1] === '') return null;

  const parts = match[1].split('~');
  if (parts.length < 40) return null;

  // 腾讯API字段顺序
  const name = parts[1];          // 名称
  const price = parseFloat(parts[3]) || 0;    // 当前价格
  const preClose = parseFloat(parts[4]) || 0; // 昨收
  const open = parseFloat(parts[5]) || 0;     // 今开
  const high = parseFloat(parts[33]) || 0;    // 最高
  const low = parseFloat(parts[34]) || 0;     // 最低
  const time = parts[35] || '';               // 时间

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
    volume: 0,
    amount: 0,
    change,
    changePercent,
    time,
  };
}

// 带代理的fetch，处理GBK编码
async function fetchWithProxy(url: string): Promise<string> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        // 获取原始字节，然后用GBK解码
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        if (text && !text.includes('pv_none_match')) {
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

// 获取基金净值（天天基金）- UTF-8编码，无需转换
export async function fetchFundNav(code: string): Promise<{
  nav: number;
  name: string;
  date: string;
} | null> {
  try {
    // 天天基金API - UTF-8编码
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    // 天天基金返回UTF-8，直接用text()解析
    const text = await response.text();

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

// ===== K线数据 API =====

// CORS 代理列表
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// 获取股票 K线数据（多数据源支持）
export async function fetchKLineData(
  code: string,
  period: 'day' | 'week' | 'month' = 'day',
  count: number = 60
): Promise<KLineData[]> {
  // 尝试多个数据源
  // 1. 东方财富 API
  const emResult = await fetchKLineFromEastmoney(code, period, count);
  if (emResult.length > 0) return emResult;

  // 2. 新浪财经 API（备用）
  const sinaResult = await fetchKLineFromSina(code, period, count);
  if (sinaResult.length > 0) return sinaResult;

  return [];
}

// 东方财富 K线 API
async function fetchKLineFromEastmoney(
  code: string,
  period: 'day' | 'week' | 'month',
  count: number
): Promise<KLineData[]> {
  const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;
  const params = new URLSearchParams({
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63',
    klt: period === 'day' ? '101' : period === 'week' ? '102' : '103',
    fqt: '1',
    end: '20500101',
    lmt: String(count),
  });

  const apiUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${params}`;

  // 尝试多个 CORS 代理
  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy(apiUrl);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.data?.klines) {
        return data.data.klines.map((line: string) => {
          const parts = line.split(',');
          return {
            date: parts[0],
            open: parseFloat(parts[1]) || 0,
            close: parseFloat(parts[2]) || 0,
            high: parseFloat(parts[3]) || 0,
            low: parseFloat(parts[4]) || 0,
            volume: parseFloat(parts[5]) || 0,
            amount: parseFloat(parts[6]) || 0,
            changePercent: parseFloat(parts[8]) || 0,
          };
        });
      }
    } catch (e) {
      console.warn('Eastmoney K-line proxy failed:', proxy(apiUrl));
    }
  }

  return [];
}

// 新浪财经 K线 API（备用）
async function fetchKLineFromSina(
  code: string,
  period: 'day' | 'week' | 'month',
  count: number
): Promise<KLineData[]> {
  const shsz = code.startsWith('6') ? 'sh' : 'sz';
  const scale = period === 'day' ? '240' : period === 'week' ? '5' : '30';
  const apiUrl = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${shsz}${code}&scale=${scale}&datalen=${count}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy(apiUrl);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          date: item.day || item.date || '',
          open: parseFloat(item.open) || 0,
          close: parseFloat(item.close) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          volume: parseFloat(item.volume) || 0,
          amount: 0,
          changePercent: 0,
        }));
      }
    } catch (e) {
      console.warn('Sina K-line proxy failed:', proxy(apiUrl));
    }
  }

  return [];
}

// ===== 基本面数据 API =====

// 获取股票基本面数据（PE/PB/ROE等）
export async function fetchStockFundamentals(code: string): Promise<StockFundamentals> {
  const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;

  // 东方财富股票信息API
  const apiUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f107,f108,f109,f110,f111,f112,f113,f114,f115,f116,f117,f118,f119,f120,f121,f122,f123,f124,f125,f126,f127,f128,f129,f130,f131,f132,f133,f134,f135,f136,f137,f138,f139,f140,f141,f142,f143,f144,f145,f146,f147,f148,f149,f150`;

  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy(apiUrl);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data?.data) {
        const d = data.data;
        // 东方财富字段映射
        // f57: 股票代码
        // f58: 股票名称
        // f107: 市盈率（动态）
        // f108: 市净率
        // f109: 净资产收益率
        // f110: 总市值
        // f111: 流通市值
        // f112: 每股收益
        // f113: 每股净资产
        return {
          pe: d.f107 !== null && d.f107 !== undefined ? parseFloat(d.f107) : null,
          pb: d.f108 !== null && d.f108 !== undefined ? parseFloat(d.f108) : null,
          roe: d.f109 !== null && d.f109 !== undefined ? parseFloat(d.f109) : null,
          totalMarketValue: d.f110 !== null && d.f110 !== undefined ? parseFloat(d.f110) / 100000000 : null, // 转为亿
          circulatingMarketValue: d.f111 !== null && d.f111 !== undefined ? parseFloat(d.f111) / 100000000 : null,
          eps: d.f112 !== null && d.f112 !== undefined ? parseFloat(d.f112) : null,
          bvps: d.f113 !== null && d.f113 !== undefined ? parseFloat(d.f113) : null,
        };
      }
    } catch (e) {
      console.warn('Stock fundamentals proxy failed:', proxy(apiUrl));
    }
  }

  // 返回空数据而不是抛错
  return {
    pe: null,
    pb: null,
    roe: null,
    totalMarketValue: null,
    circulatingMarketValue: null,
    eps: null,
    bvps: null,
  };
}

// ===== 新闻数据 API（简化版）=====

// 获取股票相关新闻
export async function fetchStockNews(
  _code: string,
  keyword: string,
  count: number = 10
): Promise<StockNews[]> {
  const results: StockNews[] = [];

  // 1. 尝试新浪财经新闻（通过财经新闻列表）
  const sinaNews = await fetchNewsFromSina(keyword, count);
  if (sinaNews.length > 0) {
    results.push(...sinaNews);
  }

  // 2. 尝试搜狐财经
  if (results.length < count) {
    const sohuNews = await fetchNewsFromSohu(keyword, count - results.length);
    results.push(...sohuNews);
  }

  // 3. 尝试头条财经
  if (results.length < count) {
    const toutiaoNews = await fetchNewsFromToutiao(keyword, count - results.length);
    results.push(...toutiaoNews);
  }

  // 去重并返回
  const uniqueResults = results.filter((item, index, self) =>
    index === self.findIndex(t => t.title === item.title)
  );

  return uniqueResults.slice(0, count);
}

// 新浪财经新闻（通过公开的财经新闻API）
async function fetchNewsFromSina(keyword: string, count: number): Promise<StockNews[]> {
  try {
    // 新浪财经的公开新闻搜索
    const apiUrl = `https://search.sina.com.cn/?q=${encodeURIComponent(keyword)}&c=news&sort=time`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        // 解析搜索结果HTML
        const newsItems: StockNews[] = [];
        // 新浪搜索结果格式
        const titleRegex = /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        let index = 0;

        while ((match = titleRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          if (title && title.length > 10 && !title.includes('新浪')) {
            newsItems.push({
              id: `sina-${index}`,
              title: title,
              summary: '',
              source: '新浪财经',
              publishTime: '',
              url: match[1],
            });
            index++;
          }
        }

        if (newsItems.length > 0) return newsItems;
      } catch (e) {
        console.warn('Sina news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Sina news failed:', e);
  }

  return [];
}

// 搜狐财经新闻
async function fetchNewsFromSohu(keyword: string, count: number): Promise<StockNews[]> {
  try {
    const apiUrl = `https://search.sohu.com/?keyword=${encodeURIComponent(keyword)}&type=news`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        const newsItems: StockNews[] = [];
        const titleRegex = /<a[^>]*class="news-title[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        let index = 0;

        while ((match = titleRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          if (title && title.length > 10) {
            newsItems.push({
              id: `sohu-${index}`,
              title: title,
              summary: '',
              source: '搜狐财经',
              publishTime: '',
              url: match[1],
            });
            index++;
          }
        }

        if (newsItems.length > 0) return newsItems;
      } catch (e) {
        console.warn('Sohu news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Sohu news failed:', e);
  }

  return [];
}

// 头条财经新闻（通过公开搜索）
async function fetchNewsFromToutiao(keyword: string, count: number): Promise<StockNews[]> {
  try {
    // 使用头条的公开API（如果可用）
    const apiUrl = `https://www.toutiao.com/search/?keyword=${encodeURIComponent(keyword)}&type=news`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        const newsItems: StockNews[] = [];
        // 头条搜索结果格式
        const titleRegex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi;
        let match;
        let index = 0;

        while ((match = titleRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          if (title && title.length > 10) {
            newsItems.push({
              id: `toutiao-${index}`,
              title: title,
              summary: '',
              source: '头条财经',
              publishTime: '',
              url: match[1],
            });
            index++;
          }
        }

        if (newsItems.length > 0) return newsItems;
      } catch (e) {
        console.warn('Toutiao news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Toutiao news failed:', e);
  }

  return [];
}