// 生成股票分析数据脚本 (ES Module)
// 运行方式: node scripts/generate-stock-analysis.js
// 需要 DEEPSEEK_API_KEY 环境变量

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DeepSeek API 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 待分析的股票列表
const STOCKS_TO_ANALYZE = [
  { code: '600036', name: '招商银行', industry: '银行' },
  { code: '601318', name: '中国平安', industry: '保险' },
  { code: '600000', name: '浦发银行', industry: '银行' },
  { code: '601398', name: '工商银行', industry: '银行' },
  { code: '600519', name: '贵州茅台', industry: '白酒' },
  { code: '000858', name: '五粮液', industry: '白酒' },
  { code: '002415', name: '海康威视', industry: '电子' },
  { code: '300750', name: '宁德时代', industry: '电池' },
  { code: '601012', name: '隆基绿能', industry: '光伏' },
  { code: '002594', name: '比亚迪', industry: '汽车' },
  { code: '513130', name: '恒生科技ETF', industry: 'ETF' },
  { code: '510300', name: '沪深300ETF', industry: 'ETF' },
];

// 财务数据
const MOCK_FINANCIAL_DATA = {
  '600036': { pe: 6.8, pb: 0.85, roe: 15.2, marketCap: 3200, dividendRate: 3.5 },
  '601318': { pe: 8.5, pb: 1.2, roe: 12.8, marketCap: 4500, dividendRate: 2.8 },
  '600000': { pe: 5.2, pb: 0.45, roe: 11.5, marketCap: 850, dividendRate: 3.2 },
  '601398': { pe: 5.5, pb: 0.55, roe: 10.8, marketCap: 1800, dividendRate: 5.0 },
  '600519': { pe: 28, pb: 8.5, roe: 32, marketCap: 18000, dividendRate: 1.2 },
  '000858': { pe: 22, pb: 6.2, roe: 25, marketCap: 5500, dividendRate: 1.5 },
  '002415': { pe: 18, pb: 3.5, roe: 22, marketCap: 2800, dividendRate: 0 },
  '300750': { pe: 35, pb: 5.8, roe: 18, marketCap: 8500, dividendRate: 0 },
  '601012': { pe: 12, pb: 2.8, roe: 20, marketCap: 1800, dividendRate: 0 },
  '002594': { pe: 45, pb: 8.5, roe: 12, marketCap: 6000, dividendRate: 0 },
  '513130': { pe: null, pb: null, roe: null, marketCap: null, dividendRate: null },
  '510300': { pe: null, pb: null, roe: null, marketCap: null, dividendRate: null },
};

// 调用 DeepSeek API
async function analyzeStock(stock) {
  const financial = MOCK_FINANCIAL_DATA[stock.code] || {};

  if (!DEEPSEEK_API_KEY) {
    return generateMockAnalysis(stock, financial);
  }

  const prompt = `分析${stock.name}(${stock.code})的财务指标，给出简要数据分析摘要（不是投资建议）：PE=${financial.pe||'无'}, PB=${financial.pb||'无'}, ROE=${financial.roe||'无'}%, 市值=${financial.marketCap||'无'}亿。用2-3句话分析估值水平和适合的投资者类型。`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    return {
      code: stock.code,
      name: stock.name,
      industry: stock.industry,
      financial,
      analysis: data.choices?.[0]?.message?.content?.trim() || generateMockAnalysis(stock, financial).analysis,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    return generateMockAnalysis(stock, financial);
  }
}

// 模拟分析
function generateMockAnalysis(stock, financial) {
  let analysis = '';
  if (stock.industry === 'ETF') {
    analysis = `${stock.name}是指数型ETF，适合希望跟踪指数表现的投资者，本身无PE/PB指标。`;
  } else if (financial.pe < 10 && financial.pb < 1) {
    analysis = `${stock.name}估值偏低，PE=${financial.pe}，PB=${financial.pb}，在行业中属于低估区间。ROE达${financial.roe}%，盈利稳定。适合价值投资者。`;
  } else if (financial.roe > 20) {
    analysis = `${stock.name}盈利能力突出，ROE达${financial.roe}%。PE=${financial.pe}，估值合理。适合看重成长性的投资者。`;
  } else {
    analysis = `${stock.name}PE=${financial.pe}，PB=${financial.pb}，ROE=${financial.roe}%。估值中等，建议结合行业景气度判断。`;
  }
  return { code: stock.code, name: stock.name, industry: stock.industry, financial, analysis, analyzedAt: new Date().toISOString() };
}

// 主函数
async function main() {
  console.log('开始生成股票分析数据...');
  const results = [];
  for (const stock of STOCKS_TO_ANALYZE) {
    console.log(`分析: ${stock.name}`);
    results.push(await analyzeStock(stock));
    await new Promise(r => setTimeout(r, 300));
  }
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'stock-analysis.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`完成，共${results.length}只股票`);
}

main();