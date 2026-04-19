// Vercel Edge Function - RSSHub Proxy
// 专门用于访问 RSSHub API

export const config = {
  runtime: 'edge',
};

const RSSHUB_BASE = 'https://rsshub.app';

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 构建 RSSHub URL
  const rsshubUrl = `${RSSHUB_BASE}/${path}`;

  try {
    const response = await fetch(rsshubUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'RSSHub fetch failed', message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}