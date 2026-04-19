// Vercel Edge Function - CORS Proxy
// 部署到 Vercel 后，通过 /api/proxy?url=xxx 使用

export const config = {
  runtime: 'edge',
};

// 允许的域名列表（安全控制）
const ALLOWED_ORIGINS = [
  'push2his.eastmoney.com',
  'push2.eastmoney.com',
  'newsapi.eastmoney.com',
  'np.eastmoney.com',
  'emweb.eastmoney.com',
  'qt.gtimg.cn',
  'fundgz.1234567.com.cn',
  'quotes.sina.cn',
  'apis.tianapi.com',
  'rsshub.app',
];

export default async function handler(request) {
  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 安全检查：验证目标域名
  try {
    const targetOrigin = new URL(targetUrl).hostname;
    const isAllowed = ALLOWED_ORIGINS.some(origin =>
      targetOrigin === origin || targetOrigin.endsWith('.' + origin)
    );

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 发起请求
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });

    // 获取响应内容
    const contentType = response.headers.get('Content-Type') || 'text/plain';
    const data = await response.arrayBuffer();

    // 返回带 CORS 头的响应
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Fetch failed', message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}