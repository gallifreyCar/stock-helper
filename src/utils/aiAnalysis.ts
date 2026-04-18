// AI 分析逻辑模块
// 构建 AI 分析 prompt，调用 DeepSeek/OpenAI API

import type { AIAnalysisInput, StockNews } from '../types/analysis';
import type { AIConfig } from '../types/portfolio';
import { AI_PROVIDERS } from '../types/portfolio';

// 构建 AI 分析 prompt
export function buildAnalysisPrompt(input: AIAnalysisInput): string {
  const {
    stockCode,
    stockName,
    currentPrice,
    changePercent,
    klineData,
    indicators,
    news,
    pe,
    pb,
    roe,
  } = input;

  // 计算 K 线趋势摘要
  const recentKlines = klineData.slice(-10);
  const avgClose = recentKlines.reduce((s, d) => s + d.close, 0) / recentKlines.length;
  const trendDirection = avgClose > currentPrice ? '下降' : avgClose < currentPrice ? '上升' : '持平';
  const highest = Math.max(...recentKlines.map(d => d.high));
  const lowest = Math.min(...recentKlines.map(d => d.low));

  // 新闻摘要
  const newsSummary = news.length > 0
    ? news.slice(0, 5).map(n => `- ${n.title}`).join('\n')
    : '暂无相关新闻';

  // MACD 信号解读
  const macdSignalText = indicators.macd.signal === 'bullish'
    ? '多头信号（MACD金叉或持续为正）'
    : indicators.macd.signal === 'bearish'
    ? '空头信号（MACD死叉或持续为负）'
    : '中性';

  // RSI 信号解读
  const rsiSignalText = indicators.rsi.signal === 'overbought'
    ? '超买区域（RSI>=70，注意回调风险）'
    : indicators.rsi.signal === 'oversold'
    ? '超卖区域（RSI<=30，可能存在反弹机会）'
    : '正常区间';

  // KDJ 信号解读
  const kdjSignalText = indicators.kdj.signal === 'bullish'
    ? '金叉信号（K线上穿D线）'
    : indicators.kdj.signal === 'bearish'
    ? '死叉信号（K线下穿D线）'
    : '中性';

  return `
你是一位专业的股票分析师，请根据以下数据对股票进行综合分析。

## 基本信息
- 股票：${stockName} (${stockCode})
- 当前价格：${currentPrice.toFixed(2)}元
- 今日涨跌：${changePercent.toFixed(2)}%
- PE（市盈率）：${pe ? pe.toFixed(2) : '无数据'}
- PB（市净率）：${pb ? pb.toFixed(2) : '无数据'}
- ROE（净资产收益率）：${roe ? roe.toFixed(2) + '%' : '无数据'}

## 技术指标分析
### MACD 指标
- 当前信号：${macdSignalText}（强度 ${indicators.macd.signalStrength}%）
- DIF 最新值：${indicators.macd.dif[indicators.macd.dif.length - 1]?.toFixed(4) || 'N/A'}
- DEA 最新值：${indicators.macd.dea[indicators.macd.dea.length - 1]?.toFixed(4) || 'N/A'}

### RSI 指标（14日）
- 当前 RSI：${indicators.rsi.current.toFixed(2)}
- 信号：${rsiSignalText}

### KDJ 指标（9日）
- K 值：${indicators.kdj.currentK.toFixed(2)}
- D 值：${indicators.kdj.currentD.toFixed(2)}
- J 值：${indicators.kdj.currentJ.toFixed(2)}
- 当前信号：${kdjSignalText}

## K线趋势（近10日）
- 近10日均价：${avgClose.toFixed(2)}元
- 趋势方向：${trendDirection}
- 区间最高：${highest.toFixed(2)}元
- 区间最低：${lowest.toFixed(2)}元

## 相关新闻（最近5条）
${newsSummary}

---

请按照以下结构输出分析报告：

### 1. 技术面分析（约100字）
简要解读 MACD、RSI、KDJ 指标的含义，判断当前技术面状态。

### 2. 基本面分析（约80字）
评价 PE/PB 估值水平（若无数据则跳过），判断估值合理性。

### 3. 消息面分析（约80字）
分析新闻整体倾向，指出可能影响股价的关键事件。

### 4. 综合判断（约120字）
- 短期走势预测：上涨/下跌/震荡
- 置信度：低/中/高
- 操作建议：适合关注/建议观望/谨慎对待
- 风险提示：列出主要风险因素

---

注意：
1. 分析要客观，不要直接建议买入或卖出
2. 使用中性表述："适合关注"、"建议观望"、"注意风险"
3. 报告最后加上："以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。"
`;
}

// 调用 AI API
export async function callAIAnalysis(
  prompt: string,
  aiConfig: AIConfig
): Promise<string> {
  const provider = AI_PROVIDERS[aiConfig.provider];
  const baseUrl = aiConfig.baseUrl || provider.baseUrl;
  const model = aiConfig.model || provider.defaultModel;

  if (!aiConfig.apiKey) {
    throw new Error('未配置 API Key');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'AI API 调用失败');
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

// 新闻情感分析 prompt
export function buildNewsSentimentPrompt(news: StockNews[]): string {
  const newsList = news.slice(0, 5).map(n =>
    `标题：${n.title}\n来源：${n.source}\n时间：${n.publishTime}`
  ).join('\n\n');

  return `
请分析以下股票新闻的整体情感倾向。

${newsList}

请用一句话总结：
1. 新闻整体是正面、负面还是中性？
2. 主要关注点是什么？
3. 对股价可能有什么影响？

回复控制在50字以内。
`;
}