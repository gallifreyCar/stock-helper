# A股基金投资助手

一个简洁的 Web 工具，帮助你管理 A 股和基金持仓。

[English](./README_EN.md) | **中文**

---

## 功能特性

### 📊 持仓管理
- 支持股票和基金持仓记录
- 多账户分组（长期持有/短线交易/基金定投）
- 实时行情获取（腾讯财经/天天基金）
- 自动计算市值、盈亏、收益率

### 💰 交易记录
- 支持多次加仓/减仓操作
- 自动计算平均成本价
- 已实现盈亏追踪
- 交易流水查看

### 🔍 股票筛选
- 按PE/PB/ROE筛选
- 快速筛选模板（低估值/高ROE等）
- AI数据分析摘要（基于财务指标）

### ⚠️ 价格提醒
- 设置止盈/止损价格
- 浏览器通知提醒

### 📦 数据管理
- LocalStorage 本地存储
- JSON 导出备份/导入恢复

---

## 使用方式

访问：**https://gallifreycar.github.io/stock-helper/**

或本地运行：
```bash
git clone https://github.com/gallifreycar/stock-helper.git
cd stock-helper
npm install
npm run dev
```

---

## 技术栈

- React 18 + TypeScript
- Tailwind CSS
- Vite
- GitHub Pages

---

## 数据说明

- 股票行情：腾讯财经 API（免费）
- 基金净值：天天基金 API（免费）
- 数据存储：浏览器 LocalStorage（清除缓存会丢失，请定期备份）

---

## 注意事项

⚠️ 本工具仅供参考，不构成投资建议。投资有风险，决策需谨慎。

⚠️ 数据存储在浏览器本地，换电脑/清除缓存会导致数据丢失，请定期导出备份。

---

## License

MIT