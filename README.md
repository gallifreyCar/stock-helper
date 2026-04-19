# A股基金投资助手

一个简洁的 Web 工具，帮助你管理 A 股和基金持仓，并提供 AI 智能分析。

[English](./README_EN.md) | **中文**

---

## 功能特性

### 📊 持仓管理
- 支持股票和基金持仓记录
- 多账户分组（长期持有/短线交易/基金定投）
- 实时行情获取（腾讯财经/天天基金）
- 自动计算市值、盈亏、收益率
- **云端同步**（支持 Supabase 数据库）

### 💰 交易记录
- 支持多次加仓/减仓操作
- 自动计算平均成本价
- 已实现盈亏追踪
- 交易流水查看

### 🧠 AI 智能分析
- K 线走势图表（日K/周K/月K）
- 技术指标分析（MACD、RSI、KDJ）
- 技术面评分
- 基本面数据（PE/PB/ROE）
- **AI 分析报告**（支持 DeepSeek/OpenAI/Claude）
- 相关新闻资讯

### 🔍 股票筛选
- 按PE/PB/ROE筛选
- 快速筛选模板（低估值/高ROE等）
- AI数据分析摘要（基于财务指标）

### ⚠️ 价格提醒
- 设置止盈/止损价格
- 浏览器通知提醒

### 📦 数据管理
- 本地存储 / 云端同步
- JSON 导出备份/导入恢复

---

## 一键部署

### Vercel 部署（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gallifreycar/stock-helper)

点击按钮即可一键部署到 Vercel，无需配置服务器。

**部署后配置：**

1. **Supabase 数据库**（可选，用于云端同步）
   - 访问时页面会提示配置 Supabase URL 和 anon key
   - 或在设置页面配置

2. **AI 分析**（可选）
   - 在设置页面配置 DeepSeek/OpenAI API Key

3. **新闻数据**（可选）
   - 自建 [RSSHub](https://docs.rsshub.app/deploy) 并配置 URL
   - 或配置 [TianAPI](https://www.tianapi.com) Key

### GitHub Pages 部署

```bash
git clone https://github.com/gallifreycar/stock-helper.git
cd stock-helper
npm install
npm run build
npm run deploy  # 需要 gh-pages 包
```

---

## 本地运行

```bash
git clone https://github.com/gallifreycar/stock-helper.git
cd stock-helper
npm install
npm run dev
```

---

## Demo

- **Vercel**: https://stock-helper-beta.vercel.app
- **GitHub Pages**: https://gallifreycar.github.io/stock-helper/

---

## 技术栈

- React 18 + TypeScript
- Tailwind CSS
- Vite
- Recharts（图表）
- Supabase（云端数据库）
- Vercel Edge Functions（CORS 代理）

---

## API 来源

- 股票行情：腾讯财经 API（免费）
- 基金净值：天天基金 API（免费）
- K线/指标：东方财富 API
- 新闻资讯：东方财富 / RSSHub / TianAPI
- AI分析：DeepSeek / OpenAI / Claude

---

## 注意事项

⚠️ 本工具仅供参考，不构成投资建议。投资有风险，决策需谨慎。

⚠️ 本地模式下数据存储在浏览器，换电脑/清除缓存会导致数据丢失。建议配置 Supabase 云端同步。

---

## License

MIT