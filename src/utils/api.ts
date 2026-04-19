// API 调用封装 - 使用腾讯财经API（更稳定）

import type { StockQuote } from '../types';
import type { KLineData, StockNews } from '../types/analysis';
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

// ===== 新闻数据 API（多数据源）=====

// 获取股票相关新闻（多源搜索）
export async function fetchStockNews(
  code: string,
  keyword: string,
  count: number = 10
): Promise<StockNews[]> {
  const results: StockNews[] = [];

  // 1. 腾讯财经新闻
  const tencentNews = await fetchNewsFromTencent(code, keyword, Math.ceil(count / 2));
  results.push(...tencentNews);

  // 2. 东方财富新闻
  const emNews = await fetchNewsFromEastmoney(code, keyword, Math.ceil(count / 2));
  results.push(...emNews);

  // 3. 如果新闻太少，用搜索引擎补充
  if (results.length < count) {
    const searchNews = await fetchNewsFromSearch(keyword, count - results.length);
    results.push(...searchNews);
  }

  // 去重并返回
  const uniqueResults = results.filter((item, index, self) =>
    index === self.findIndex(t => t.title === item.title)
  );

  return uniqueResults.slice(0, count);
}

// 腾讯财经新闻
async function fetchNewsFromTencent(code: string, _keyword: string, count: number): Promise<StockNews[]> {
  try {
    const shsz = code.startsWith('6') ? 'sh' : 'sz';
    const apiUrl = `https://qt.gtimg.cn/q=${shsz}${code}&format=news`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        // 腾讯新闻格式解析
        const newsItems: StockNews[] = [];
        const newsRegex = /title="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g;
        let match;
        let index = 0;

        while ((match = newsRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[1];
          if (title && title.length > 5 && !title.includes('腾讯') && !title.includes('qq.com')) {
            newsItems.push({
              id: `tencent-${index}`,
              title: title.trim(),
              summary: '',
              source: '腾讯财经',
              publishTime: '',
              url: match[2] || '',
            });
            index++;
          }
        }

        if (newsItems.length > 0) return newsItems;
      } catch (e) {
        console.warn('Tencent news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Tencent news failed:', e);
  }

  return [];
}

// 东方财富新闻
async function fetchNewsFromEastmoney(code: string, _keyword: string, count: number): Promise<StockNews[]> {
  try {
    const secid = code.startsWith('6') ? `SH${code}` : `SZ${code}`;
    const apiUrl = `https://npinterface.eastmoney.com/NewsInformation/NewsInformationGet?code=${secid}&pageSize=${count}&pageNum=1&type=0`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) continue;

        const data = await response.json();

        if (data?.NewsList && Array.isArray(data.NewsList)) {
          return data.NewsList.map((item: any, index: number) => ({
            id: `em-${index}`,
            title: item.InfoTitle || '',
            summary: item.InfoContent?.slice(0, 200) || '',
            source: item.InfoSource || '东方财富',
            publishTime: item.InfoTime || '',
            url: item.InfoUrl || '',
          })).filter((item: StockNews) => item.title.length > 5);
        }
      } catch (e) {
        console.warn('Eastmoney news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Eastmoney news failed:', e);
  }

  return [];
}

// 搜索引擎新闻（备用）
async function fetchNewsFromSearch(keyword: string, count: number): Promise<StockNews[]> {
  try {
    // 使用搜狗新闻搜索（相对开放）
    const apiUrl = `https://news.sogou.com/news?query=${encodeURIComponent(keyword)}&sort=1`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        // 解析搜狗新闻HTML
        const newsItems: StockNews[] = [];
        const titleRegex = /<a[^>]*class="news-title[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        let index = 0;

        while ((match = titleRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          if (title && title.length > 10) {
            newsItems.push({
              id: `search-${index}`,
              title: title,
              summary: '',
              source: '新闻搜索',
              publishTime: '',
              url: match[1],
            });
            index++;
          }
        }

        // 如果搜狗失败，尝试360新闻
        if (newsItems.length === 0) {
          const news360 = await fetchNewsFrom360(keyword, count);
          if (news360.length > 0) return news360;
        }

        return newsItems;
      } catch (e) {
        console.warn('Search news proxy failed');
      }
    }
  } catch (e) {
    console.warn('Search news failed:', e);
  }

  return [];
}

// 360新闻搜索
async function fetchNewsFrom360(keyword: string, count: number): Promise<StockNews[]> {
  try {
    const apiUrl = `https://news.so.com/ns?q=${encodeURIComponent(keyword)}&src=news`;

    for (const proxy of CORS_PROXIES) {
      try {
        const url = proxy(apiUrl);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) continue;

        const text = await response.text();

        const newsItems: StockNews[] = [];
        // 360新闻HTML结构
        const titleRegex = /<h3[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        let index = 0;

        while ((match = titleRegex.exec(text)) !== null && newsItems.length < count) {
          const title = match[2].trim();
          if (title && title.length > 10) {
            newsItems.push({
              id: `360-${index}`,
              title: title,
              summary: '',
              source: '360新闻',
              publishTime: '',
              url: match[1],
            });
            index++;
          }
        }

        return newsItems;
      } catch (e) {
        console.warn('360 news proxy failed');
      }
    }
  } catch (e) {
    console.warn('360 news failed:', e);
  }

  return [];
}