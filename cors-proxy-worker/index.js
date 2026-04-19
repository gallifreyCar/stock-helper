// Cloudflare Workers CORS 代理
// 部署步骤：
// 1. 注册 Cloudflare 账号（免费）
// 2. 进入 Workers & Pages
// 3. 创建 Worker，粘贴此代码
// 4. 部署后获取 URL（如 https://cors-proxy.xxx.workers.dev）
// 5. 在应用设置中配置该 URL

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 获取目标 URL
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // 安全检查：只允许特定域名
    const allowedOrigins = [
      'push2his.eastmoney.com',
      'push2.eastmoney.com',
      'newsapi.eastmoney.com',
      'np.eastmoney.com',
      'emweb.eastmoney.com',
      'qt.gtimg.cn',
      'fundgz.1234567.com.cn',
      'quotes.sina.cn',
      'apis.tianapi.com',
    ];

    const targetOrigin = new URL(targetUrl).hostname;
    if (!allowedOrigins.some(origin => targetOrigin.includes(origin))) {
      return new Response('Origin not allowed', { status: 403 });
    }

    // 发起请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    // 复制响应并添加 CORS 头
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');

    return newResponse;
  },
};