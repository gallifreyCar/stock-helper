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

// 带代理的fetch，处理GBK编码（腾讯财经API）
async function fetchWithProxy(url: string, corsProxyUrl?: string): Promise<string> {
  // 开发环境：使用本地代理
  if (IS_DEV) {
    try {
      // 腾讯财经API通过本地代理
      const proxyUrl = url.replace('https://qt.gtimg.cn/q=', '/api/tencent?q=');
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        if (text && !text.includes('pv_none_match')) {
          return text;
        }
      }
    } catch (e) {
      console.warn('Local proxy failed:', e);
    }
  }

  // 生产环境：使用同域代理或自定义代理
  const proxyEndpoint = corsProxyUrl || SAME_ORIGIN_PROXY;
  try {
    const proxyUrl = `${proxyEndpoint}?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('gbk');
      const text = decoder.decode(buffer);
      if (text && !text.includes('pv_none_match')) {
        return text;
      }
    }
  } catch (e) {
    console.warn('Proxy failed:', e);
  }

  throw new Error('All proxies failed');
}

// 获取单只股票行情
export async function fetchStockQuote(code: string, corsProxyUrl?: string): Promise<StockQuote | null> {
  try {
    const fullCode = formatStockCode(code);
    // 腾讯API格式：sh600000 或 sz000001（不带下划线）
    const url = `${TENCENT_API_BASE}${fullCode}`;
    const text = await fetchWithProxy(url, corsProxyUrl);
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

// ===== API 配置 =====

// 判断是否开发环境（使用本地代理）
const IS_DEV = import.meta.env.DEV;

// CORS 代理列表（生产环境备用 - 用户可自定义）
const DEFAULT_CORS_PROXIES: ((url: string) => string)[] = [
  // 公共代理不稳定，建议用户自建
];

// 同域代理路径（如果部署在 Vercel）
const SAME_ORIGIN_PROXY = '/api/proxy';

// 带代理的 fetch（开发环境用本地代理，生产环境用 CORS proxy）
async function fetchWithProxyFallback(url: string, timeout: number = 10000, corsProxyUrl?: string): Promise<Response | null> {
  // 开发环境：使用 Vite 本地代理
  if (IS_DEV) {
    try {
      const proxyUrl = convertToLocalProxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(timeout),
      });
      if (response.ok) return response;
    } catch (e) {
      console.warn('Local proxy failed:', e);
    }
  }

  // 同域代理（如果部署在 Vercel，api/proxy 可用）
  if (!IS_DEV && !corsProxyUrl) {
    try {
      const proxyUrl = `${SAME_ORIGIN_PROXY}?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(timeout),
      });
      if (response.ok) return response;
    } catch (e) {
      console.warn('Same-origin proxy failed:', e);
    }
  }

  // 用户自定义 CORS 代理
  if (corsProxyUrl) {
    try {
      const proxyUrl = `${corsProxyUrl}?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(timeout),
      });
      if (response.ok) return response;
    } catch (e) {
      console.warn('Custom CORS proxy failed:', e);
    }
  }

  // 默认 CORS 代理（公共代理可能不稳定）
  for (const proxy of DEFAULT_CORS_PROXIES) {
    try {
      const proxyUrl = proxy(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(timeout),
      });
      if (response.ok) return response;
    } catch (e) {
      console.warn('Default CORS proxy failed:', e);
    }
  }

  return null;
}

// 将外部 URL 转换为本地代理路径
function convertToLocalProxy(url: string): string {
  // 东方财富新闻 API
  if (url.includes('newsapi.eastmoney.com')) {
    const path = url.replace('https://newsapi.eastmoney.com', '');
    return `/api/em-news${path.replace('/kuaixun/v1', '')}`;
  }
  // 东方财富个股新闻 API
  if (url.includes('np.eastmoney.com/api/news')) {
    const path = url.replace('https://np.eastmoney.com/api/news', '');
    return `/api/em-stock-news${path}`;
  }
  // 东方财富 K线 API
  if (url.includes('push2his.eastmoney.com')) {
    const path = url.replace('https://push2his.eastmoney.com/api/qt/stock/kline', '');
    return `/api/em-kline${path}`;
  }
  // 东方财富行情 API
  if (url.includes('push2.eastmoney.com')) {
    const path = url.replace('https://push2.eastmoney.com/api/qt/stock', '');
    return `/api/em-quote${path}`;
  }
  // 东方财富基本面 API
  if (url.includes('emweb.eastmoney.com')) {
    const path = url.replace('https://emweb.eastmoney.com', '');
    return `/api/em-fundamentals${path}`;
  }
  return url;
}

// ===== K线数据 API =====

// 获取股票 K线数据（多数据源支持）
export async function fetchKLineData(
  code: string,
  period: 'day' | 'week' | 'month' = 'day',
  count: number = 60,
  corsProxyUrl?: string
): Promise<KLineData[]> {
  // 优先使用本地代理
  const emResult = await fetchKLineFromEastmoney(code, period, count, corsProxyUrl);
  if (emResult.length > 0) return emResult;

  // 备用：新浪财经 API
  const sinaResult = await fetchKLineFromSina(code, period, count, corsProxyUrl);
  if (sinaResult.length > 0) return sinaResult;

  return [];
}

// 东方财富 K线 API
async function fetchKLineFromEastmoney(
  code: string,
  period: 'day' | 'week' | 'month',
  count: number,
  corsProxyUrl?: string
): Promise<KLineData[]> {
  // 东方财富市场代码：1=上海，0=深圳
  // 上海：6开头股票，51/58/50开头ETF
  // 深圳：0/3开头股票，15/16开头ETF
  const isShanghai = code.startsWith('6') || code.startsWith('51') || code.startsWith('58') || code.startsWith('50');
  const secid = isShanghai ? `1.${code}` : `0.${code}`;
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

  const response = await fetchWithProxyFallback(apiUrl, 15000, corsProxyUrl);
  if (!response) return [];

  try {
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
    console.warn('Eastmoney K-line failed:', e);
  }

  return [];
}

// 新浪财经 K线 API（备用）
async function fetchKLineFromSina(
  code: string,
  period: 'day' | 'week' | 'month',
  count: number,
  corsProxyUrl?: string
): Promise<KLineData[]> {
  const shsz = code.startsWith('6') ? 'sh' : 'sz';
  const scale = period === 'day' ? '240' : period === 'week' ? '5' : '30';
  const apiUrl = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${shsz}${code}&scale=${scale}&datalen=${count}`;

  const response = await fetchWithProxyFallback(apiUrl, 15000, corsProxyUrl);
  if (!response) return [];

  try {
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
    console.warn('Sina K-line failed:', e);
  }

  return [];
}

// ===== 基本面数据 API =====

// 获取股票基本面数据（PE/PB/ROE等）
export async function fetchStockFundamentals(code: string, corsProxyUrl?: string): Promise<StockFundamentals> {
  const isShanghai = code.startsWith('6') || code.startsWith('51') || code.startsWith('58') || code.startsWith('50');
  const secid = isShanghai ? `1.${code}` : `0.${code}`;

  // 东方财富股票信息API
  const apiUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f107,f108,f109,f110,f111,f112,f113,f114,f115,f116,f117,f118,f119,f120,f121,f122,f123,f124,f125,f126,f127,f128,f129,f130,f131,f132,f133,f134,f135,f136,f137,f138,f139,f140,f141,f142,f143,f144,f145,f146,f147,f148,f149,f150`;

  const response = await fetchWithProxyFallback(apiUrl, 10000, corsProxyUrl);
  if (!response) return {
        pe: null,
        pb: null,
        roe: null,
        totalMarketValue: null,
        circulatingMarketValue: null,
        eps: null,
        bvps: null,
      };

  try {
    const data = await response.json();

    if (data?.data) {
      const d = data.data;
      return {
        pe: d.f107 !== null && d.f107 !== undefined ? parseFloat(d.f107) : null,
        pb: d.f108 !== null && d.f108 !== undefined ? parseFloat(d.f108) : null,
        roe: d.f109 !== null && d.f109 !== undefined ? parseFloat(d.f109) : null,
        totalMarketValue: d.f110 !== null && d.f110 !== undefined ? parseFloat(d.f110) / 100000000 : null,
        circulatingMarketValue: d.f111 !== null && d.f111 !== undefined ? parseFloat(d.f111) / 100000000 : null,
        eps: d.f112 !== null && d.f112 !== undefined ? parseFloat(d.f112) : null,
        bvps: d.f113 !== null && d.f113 !== undefined ? parseFloat(d.f113) : null,
      };
    }
  } catch (e) {
    console.warn('Stock fundamentals failed:', e);
  }

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

// ===== 新闻数据 API =====

// 获取股票相关新闻（优先RSSHub，实时性最好）
export async function fetchStockNews(
  code: string,
  keyword: string,
  count: number = 10,
  tianApiKey?: string,
  rsshubUrl?: string,
  corsProxyUrl?: string
): Promise<StockNews[]> {
  const results: StockNews[] = [];

  // 1. RSSHub 东方财富搜索（自建实例 CORS 已配置，直接访问）
  if (rsshubUrl) {
    const rsshubNews = await fetchNewsFromRSSHub(rsshubUrl, code, keyword, count);
    if (rsshubNews.length > 0) {
      results.push(...rsshubNews);
    }
  }

  // 2. 东方财富个股新闻 API（需要 CORS 代理）
  if (results.length < count) {
    const emNews = await fetchNewsFromEastmoney(code, count - results.length, corsProxyUrl);
    if (emNews.length > 0) {
      results.push(...emNews);
    }
  }

  // 3. TianAPI（如果配置了Key）- 无需 CORS 代理
  if (results.length < count && tianApiKey) {
    const tianNews = await fetchNewsFromTianAPI(tianApiKey, keyword, count - results.length);
    if (tianNews.length > 0) {
      results.push(...tianNews);
    }
  }

  // 4. 东方财富实时财经新闻 API（备用）
  if (results.length < count) {
    const realtimeNews = await fetchRealtimeFinancialNews(keyword, count - results.length, corsProxyUrl);
    if (realtimeNews.length > 0) {
      results.push(...realtimeNews);
    }
  }

  // 5. 如果都没有获取到，返回引导信息
  if (results.length === 0) {
    const isShanghai = code.startsWith('6') || code.startsWith('51') || code.startsWith('58') || code.startsWith('50');
    const secid = isShanghai ? `sh${code}` : `sz${code}`;
    return [{
      id: 'guide',
      title: `点击查看 ${keyword} 最新资讯`,
      summary: '新闻数据暂时无法获取，请访问东方财富或新浪财经查看最新资讯',
      source: '手动查看',
      publishTime: '',
      url: `https://quote.eastmoney.com/${secid}.html#news`,
    }];
  }

  // 去重并返回
  const uniqueResults = results.filter((item, index, self) =>
    index === self.findIndex(t => t.title === item.title)
  );

  return uniqueResults.slice(0, count);
}

// RSSHub 东方财富搜索新闻
async function fetchNewsFromRSSHub(
  rsshubUrl: string,
  _code: string,
  keyword: string,
  count: number
): Promise<StockNews[]> {
  const newsItems: StockNews[] = [];
  const seenTitles = new Set<string>();

  // HTML 实体解码函数
  const decodeHtmlEntities = (str: string): string => {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/<em>/g, '')
      .replace(/<\/em>/g, '');
  };

  const parseRSS = (text: string, source: string) => {
    const itemRegex = /<item>(.*?)<\/item>/gs;
    let itemMatch;
    let index = 0;

    while ((itemMatch = itemRegex.exec(text)) !== null && newsItems.length < count) {
      const itemContent = itemMatch[1];

      const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : '';

      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const url = linkMatch ? linkMatch[1].trim() : '';

      const descMatch = itemContent.match(/<description>(.*?)<\/description>/);
      const summary = descMatch ? decodeHtmlEntities(descMatch[1]).substring(0, 150) : '';

      const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const publishTime = dateMatch ? dateMatch[1].trim() : '';

      const authorMatch = itemContent.match(/<author>(.*?)<\/author>/);
      const newsSource = authorMatch ? decodeHtmlEntities(authorMatch[1]).trim() : '东方财富';

      if (title && title.length > 10 && !seenTitles.has(title)) {
        seenTitles.add(title);
        newsItems.push({
          id: `rsshub-${source}-${index}`,
          title,
          summary,
          source: newsSource,
          publishTime: publishTime ? new Date(publishTime).toLocaleString('zh-CN') : '',
          url,
        });
        index++;
      }
    }
  };

  // 用股票名称搜索（最相关）
  try {
    const nameApiUrl = `${rsshubUrl}/eastmoney/search/${encodeURIComponent(keyword)}`;
    const response = await fetch(nameApiUrl, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const text = await response.text();
      parseRSS(text, 'name');
    }
  } catch (e) {
    console.warn('RSSHub name search failed:', e);
  }

  return newsItems.slice(0, count);
}

// TianAPI 财经新闻 API
async function fetchNewsFromTianAPI(
  apiKey: string,
  keyword: string,
  count: number
): Promise<StockNews[]> {
  try {
    // TianAPI 财经新闻接口 (caijing)
    // 支持 word 参数搜索关键词
    const apiUrl = `https://apis.tianapi.com/caijing/index?key=${apiKey}&num=${count}&word=${encodeURIComponent(keyword)}`;

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const data = await response.json();

    if (data.code === 200 && data.result?.newslist) {
      return data.result.newslist.map((item: any, index: number) => ({
        id: `tian-${index}`,
        title: item.title || '',
        summary: item.description || '',
        source: item.source || 'TianAPI',
        publishTime: item.ctime || '',
        url: item.url || '',
      }));
    }
  } catch (e) {
    console.warn('TianAPI news failed:', e);
  }

  return [];
}

// 东方财富实时财经新闻 API（通过代理获取）
async function fetchRealtimeFinancialNews(keyword: string, count: number, corsProxyUrl?: string): Promise<StockNews[]> {
  try {
    // 开发环境：使用本地代理
    if (IS_DEV) {
      const proxyUrl = `/api/em-news/getlist_102_ajaxResult_50_1_.html`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const text = await response.text();
      return parseEastmoneyNews(text, keyword, count);
    }

    // 生产环境：使用 CORS 代理
    if (corsProxyUrl) {
      const apiUrl = 'https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_50_1_.html';
      const response = await fetch(`${corsProxyUrl}?url=${encodeURIComponent(apiUrl)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const text = await response.text();
      return parseEastmoneyNews(text, keyword, count);
    }

    // 无 CORS 代理：尝试 JSONP 方式加载
    return await loadEastmoneyNewsViaJSONP(keyword, count);
  } catch (e) {
    console.warn('Realtime news failed:', e);
  }

  return [];
}

// 解析东方财富新闻 JSONP 数据
function parseEastmoneyNews(text: string, keyword: string, count: number): StockNews[] {
  // 解析 JSONP 格式: var ajaxResult = {...}
  const jsonMatch = text.match(/var\s+ajaxResult\s*=\s*(\{[\s\S]*\})/);
  if (!jsonMatch) return [];

  const data = JSON.parse(jsonMatch[1]);
  if (data?.LivesList && Array.isArray(data.LivesList)) {
    // 过滤包含关键词的新闻
    const filteredNews = data.LivesList
      .filter((item: any) => {
        const title = item.title || item.simtitle || '';
        const digest = item.digest || item.simdigest || '';
        return title.includes(keyword) || digest.includes(keyword) ||
               keyword.includes(title.substring(0, 4));
      })
      .slice(0, count)
      .map((item: any, index: number) => ({
        id: `em-realtime-${index}`,
        title: item.title || item.simtitle || '',
        summary: (item.digest || item.simdigest || '').substring(0, 100),
        source: '东方财富快讯',
        publishTime: item.showtime || '',
        url: item.url_w || item.url_m || item.url_unique || '',
      }));

    // 如果没有匹配的新闻，返回前几条通用财经新闻
    if (filteredNews.length === 0 && data.LivesList.length > 0) {
      return data.LivesList.slice(0, Math.min(5, count)).map((item: any, index: number) => ({
        id: `em-general-${index}`,
        title: item.title || item.simtitle || '',
        summary: (item.digest || item.simdigest || '').substring(0, 100),
        source: '财经快讯',
        publishTime: item.showtime || '',
        url: item.url_w || item.url_m || item.url_unique || '',
      }));
    }

    return filteredNews;
  }

  return [];
}

// 通过 script 加载东方财富新闻（生产环境备用）
async function loadEastmoneyNewsViaJSONP(keyword: string, count: number): Promise<StockNews[]> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      const script = document.getElementById('em-news-script');
      if (script) script.remove();
    };

    // 创建 script 元素加载（东方财富返回 var ajaxResult=... 格式）
    const script = document.createElement('script');
    script.id = 'em-news-script';
    script.src = `https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_50_1_.html`;
    script.onerror = () => {
      cleanup();
      resolve([]);
    };

    // 等待 script 加载完成后读取全局变量
    script.onload = () => {
      cleanup();
      try {
        const data = (window as any).ajaxResult;
        if (data?.LivesList && Array.isArray(data.LivesList)) {
          const filteredNews = data.LivesList
            .filter((item: any) => {
              const title = item.title || item.simtitle || '';
              const digest = item.digest || item.simdigest || '';
              return title.includes(keyword) || digest.includes(keyword) ||
                     keyword.includes(title.substring(0, 4));
            })
            .slice(0, count)
            .map((item: any, index: number) => ({
              id: `em-script-${index}`,
              title: item.title || item.simtitle || '',
              summary: (item.digest || item.simdigest || '').substring(0, 100),
              source: '东方财富快讯',
              publishTime: item.showtime || '',
              url: item.url_w || item.url_m || item.url_unique || '',
            }));

          if (filteredNews.length === 0 && data.LivesList.length > 0) {
            resolve(data.LivesList.slice(0, Math.min(5, count)).map((item: any, index: number) => ({
              id: `em-script-gen-${index}`,
              title: item.title || item.simtitle || '',
              summary: (item.digest || item.simdigest || '').substring(0, 100),
              source: '财经快讯',
              publishTime: item.showtime || '',
              url: item.url_w || item.url_m || item.url_unique || '',
            })));
          } else {
            resolve(filteredNews);
          }
        } else {
          resolve([]);
        }
      } catch (e) {
        console.warn('Parse eastmoney news failed:', e);
        resolve([]);
      }
    };

    document.head.appendChild(script);
  });
}

// 东方财富个股新闻 API
async function fetchNewsFromEastmoney(code: string, count: number, corsProxyUrl?: string): Promise<StockNews[]> {
  try {
    const isShanghai = code.startsWith('6') || code.startsWith('51') || code.startsWith('58') || code.startsWith('50');
    const secid = isShanghai ? `1.${code}` : `0.${code}`;
    const apiUrl = `https://np.eastmoney.com/api/news/getlistbycode?code=${secid}&pagesize=${count}&pageindex=1`;

    const response = await fetchWithProxyFallback(apiUrl, 8000, corsProxyUrl);
    if (!response) return [];

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      if (data?.data?.list && Array.isArray(data.data.list)) {
        return data.data.list.map((item: any, index: number) => ({
          id: `em-${index}`,
          title: item.title || item.Title || '',
          summary: item.digest || item.Digest || '',
          source: '东方财富',
          publishTime: item.time || item.Time || item.showtime || '',
          url: item.url || item.Url || `https://finance.eastmoney.com/a/${item.code || item.Code}.html`,
        })).filter((n: StockNews) => n.title.length > 5);
      }
    } catch {
      // JSON 解析失败
    }
  } catch (e) {
    console.warn('Eastmoney news failed:', e);
  }

  return [];
}