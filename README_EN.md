# A-Share & Fund Investment Helper

A simple web tool to help you manage A-share stocks and fund positions.

**English** | [中文](./README.md)

---

## Features

### 📊 Portfolio Management
- Stock and fund position tracking
- Multiple account groups (Long-term / Short-term / Fund DCA)
- Real-time quotes (Tencent Finance / Tiantian Fund)
- Automatic calculation of market value, profit/loss, return rate

### 💰 Transaction Records
- Multiple buy/sell operations support
- Average cost price calculation
- Realized profit tracking
- Transaction history view

### 🔍 Stock Screener
- Filter by PE/PB/ROE
- Quick filter templates (Low valuation / High ROE)
- AI data analysis summary (based on financial indicators)

### ⚠️ Price Alerts
- Set target profit/loss prices
- Browser notifications

### 📦 Data Management
- LocalStorage for local data storage
- JSON export/import for backup

---

## Usage

Visit: **https://gallifreycar.github.io/stock-helper/**

Or run locally:
```bash
git clone https://github.com/gallifreycar/stock-helper.git
cd stock-helper
npm install
npm run dev
```

---

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS
- Vite
- GitHub Pages

---

## Data Notes

- Stock quotes: Tencent Finance API (free)
- Fund NAV: Tiantian Fund API (free)
- Data storage: Browser LocalStorage (clearing cache will lose data, backup regularly)

---

## Disclaimer

⚠️ This tool is for reference only and does not constitute investment advice. Investment involves risks, make decisions carefully.

⚠️ Data is stored locally in browser. Changing computer/clearing cache will lose data. Please backup regularly.

---

## License

MIT