import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel 部署不需要 base path，gh-pages 需要 '/stock-helper/'
  // 如果要部署到 gh-pages，改为 base: '/stock-helper/'
  base: '/',
  server: {
    proxy: {
      // 东方财富新闻 API 代理
      '/api/em-news': {
        target: 'https://newsapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em-news/, '/kuaixun/v1'),
      },
      // 东方财富个股新闻 API 代理
      '/api/em-stock-news': {
        target: 'https://np.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em-stock-news/, '/api/news'),
      },
      // 东方财富 K线 API 代理
      '/api/em-kline': {
        target: 'https://push2his.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em-kline/, '/api/qt/stock/kline'),
      },
      // 东方财富行情 API 代理
      '/api/em-quote': {
        target: 'https://push2.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em-quote/, '/api/qt/stock'),
      },
      // RSSHub API 代理（用于新闻搜索）
      '/api/rsshub': {
        target: 'https://rsshub.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rsshub/, ''),
      },
      // 腾讯财经 API 代理（用于行情）
      '/api/tencent': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent/, '/q'),
      },
    },
  },
})
