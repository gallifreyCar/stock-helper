// 智能分析主页面
// 支持搜索任意股票，获取 K线、技术指标、新闻、AI 分析报告

import { useState, useCallback } from 'react';
import { Search, Sparkles, TrendingUp, TrendingDown, Newspaper, Loader2, AlertCircle } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { fetchKLineData, fetchStockNews, fetchStockQuote } from '../utils/api';
import { calculateAllIndicators, getTechnicalScore } from '../utils/technicalIndicators';
import { buildAnalysisPrompt, callAIAnalysis } from '../utils/aiAnalysis';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar } from 'recharts';
import type { KLineData, TechnicalIndicatorsResult, StockNews } from '../types/analysis';

export function Analysis() {
  const { data } = useStorage();
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 数据状态
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicatorsResult | null>(null);
  const [news, setNews] = useState<StockNews[]>([]);
  const [currentQuote, setCurrentQuote] = useState<{ price: number; changePercent: number } | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [technicalScore, setTechnicalScore] = useState<number>(50);

  // 执行分析
  const runAnalysis = useCallback(async () => {
    if (!stockCode) return;

    setLoading(true);
    setError('');
    setAiReport('');
    setKlineData([]);
    setIndicators(null);
    setNews([]);
    setCurrentQuote(null);

    try {
      // 1. 获取当前行情
      const quote = await fetchStockQuote(stockCode);
      if (quote) {
        setCurrentQuote({ price: quote.price, changePercent: quote.changePercent });
        setStockName(quote.name);
      }

      // 2. 获取 K 线数据
      const kline = await fetchKLineData(stockCode, 'day', 60);
      if (kline.length === 0) {
        throw new Error('无法获取 K 线数据，请检查股票代码');
      }
      setKlineData(kline);

      // 3. 计算技术指标
      const techIndicators = calculateAllIndicators(kline);
      setIndicators(techIndicators);
      setTechnicalScore(getTechnicalScore(techIndicators));

      // 4. 获取新闻
      const newsData = await fetchStockNews(stockCode, quote?.name || stockCode, 10);
      setNews(newsData);

      // 5. AI 综合分析
      const aiConfig = data.settings.aiConfig;
      if (aiConfig?.apiKey) {
        const prompt = buildAnalysisPrompt({
          stockCode,
          stockName: quote?.name || stockCode,
          currentPrice: quote?.price || kline[kline.length - 1]?.close || 0,
          changePercent: quote?.changePercent || 0,
          klineData: kline,
          indicators: techIndicators,
          news: newsData,
          pe: null,
          pb: null,
          roe: null,
        });

        const report = await callAIAnalysis(prompt, aiConfig);
        setAiReport(report);
      }

    } catch (e: any) {
      setError(e.message || '分析失败');
    } finally {
      setLoading(false);
    }
  }, [stockCode, data.settings.aiConfig]);

  return (
    <div className="space-y-6">
      {/* 搜索区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          股票智能分析
        </h2>

        <div className="flex gap-4">
          <input
            type="text"
            value={stockCode}
            onChange={e => setStockCode(e.target.value)}
            placeholder="输入股票代码，如 600036、000001"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={runAnalysis}
            disabled={loading || !stockCode}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                开始分析
              </>
            )}
          </button>
        </div>

        {!data.settings.aiConfig?.apiKey && (
          <p className="mt-3 text-sm text-orange-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            未配置 AI API Key，前往「设置」页面配置以获取完整 AI 分析报告
          </p>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 分析结果 */}
      {klineData.length > 0 && (
        <>
          {/* 价格和技术评分 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 当前价格卡片 */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">当前价格</p>
                  <p className="text-2xl font-bold">{currentQuote?.price?.toFixed(2) || '-'}元</p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${(currentQuote?.changePercent ?? 0) >= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {(currentQuote?.changePercent ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-medium">{(currentQuote?.changePercent ?? 0) >= 0 ? '+' : ''}{currentQuote?.changePercent?.toFixed(2) || '-'}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{stockName} ({stockCode})</p>
            </div>

            {/* 技术评分卡片 */}
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-2">技术面评分</p>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold" style={{ color: technicalScore >= 70 ? '#22c55e' : technicalScore >= 40 ? '#3b82f6' : '#ef4444' }}>
                  {technicalScore}
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${technicalScore}%`,
                        backgroundColor: technicalScore >= 70 ? '#22c55e' : technicalScore >= 40 ? '#3b82f6' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {technicalScore >= 70 ? '技术面偏强' : technicalScore >= 40 ? '技术面中性' : '技术面偏弱'}
              </p>
            </div>

            {/* 指标信号汇总 */}
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500 mb-2">指标信号</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded ${indicators?.macd.signal === 'bullish' ? 'bg-green-50' : indicators?.macd.signal === 'bearish' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">MACD</p>
                  <p className={`font-medium ${indicators?.macd.signal === 'bullish' ? 'text-green-600' : indicators?.macd.signal === 'bearish' ? 'text-red-600' : 'text-gray-600'}`}>
                    {indicators?.macd.signal === 'bullish' ? '多' : indicators?.macd.signal === 'bearish' ? '空' : '中'}
                  </p>
                </div>
                <div className={`p-2 rounded ${indicators?.rsi.signal === 'oversold' ? 'bg-green-50' : indicators?.rsi.signal === 'overbought' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">RSI</p>
                  <p className={`font-medium ${indicators?.rsi.signal === 'oversold' ? 'text-green-600' : indicators?.rsi.signal === 'overbought' ? 'text-red-600' : 'text-gray-600'}`}>
                    {indicators?.rsi.current.toFixed(0)}
                  </p>
                </div>
                <div className={`p-2 rounded ${indicators?.kdj.signal === 'bullish' ? 'bg-green-50' : indicators?.kdj.signal === 'bearish' ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">KDJ</p>
                  <p className={`font-medium ${indicators?.kdj.signal === 'bullish' ? 'text-green-600' : indicators?.kdj.signal === 'bearish' ? 'text-red-600' : 'text-gray-600'}`}>
                    {indicators?.kdj.signal === 'bullish' ? '多' : indicators?.kdj.signal === 'bearish' ? '空' : '中'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* K 线图表 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              K 线走势（近60日）
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={klineData.map((d, i) => ({
                  date: d.date.slice(5),
                  close: d.close,
                  high: d.high,
                  low: d.low,
                  volume: d.volume / 10000,
                  macd: indicators?.macd.macd[i - (klineData.length - (indicators?.macd.macd.length || 0))] || 0,
                }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="price" domain={['auto', 'auto']} width={60} />
                  <YAxis yAxisId="volume" orientation="right" domain={['auto', 'auto']} width={0} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border shadow-lg rounded p-3 text-sm">
                            <p className="font-medium">{d.date}</p>
                            <p>收盘: <span className="font-medium">{d.close?.toFixed(2)}</span></p>
                            <p>最高: {d.high?.toFixed(2)}</p>
                            <p>最低: {d.low?.toFixed(2)}</p>
                            <p>成交量: {d.volume?.toFixed(0)}万手</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="close"
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill="#94a3b8"
                    barSize={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 技术指标详情 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">技术指标详情</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* MACD */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">MACD</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">DIF</span>
                    <span className="font-medium">{indicators?.macd.dif[indicators.macd.dif.length - 1]?.toFixed(4) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DEA</span>
                    <span className="font-medium">{indicators?.macd.dea[indicators.macd.dea.length - 1]?.toFixed(4) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">MACD</span>
                    <span className={`font-medium ${(indicators?.macd.macd[indicators.macd.macd.length - 1] || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(indicators?.macd.macd[indicators.macd.macd.length - 1] || 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${indicators?.macd.signal === 'bullish' ? 'bg-green-100 text-green-700' : indicators?.macd.signal === 'bearish' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {indicators?.macd.signal === 'bullish' ? '多头信号' : indicators?.macd.signal === 'bearish' ? '空头信号' : '中性'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RSI */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">RSI (14)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">当前值</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{indicators?.rsi.current.toFixed(2)}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${indicators?.rsi.current}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>超卖 30</span>
                    <span>中性 50</span>
                    <span>超买 70</span>
                  </div>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${indicators?.rsi.signal === 'oversold' ? 'bg-green-100 text-green-700' : indicators?.rsi.signal === 'overbought' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {indicators?.rsi.signal === 'oversold' ? '超卖' : indicators?.rsi.signal === 'overbought' ? '超买' : '正常区间'}
                    </span>
                  </div>
                </div>
              </div>

              {/* KDJ */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">KDJ (9)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">K</span>
                    <span className="font-medium">{indicators?.kdj.currentK.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">D</span>
                    <span className="font-medium">{indicators?.kdj.currentD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">J</span>
                    <span className={`font-medium ${(indicators?.kdj.currentJ ?? 50) > 100 ? 'text-red-600' : (indicators?.kdj.currentJ ?? 50) < 0 ? 'text-green-600' : ''}`}>
                      {indicators?.kdj.currentJ.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${indicators?.kdj.signal === 'bullish' ? 'bg-green-100 text-green-700' : indicators?.kdj.signal === 'bearish' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {indicators?.kdj.signal === 'bullish' ? '金叉信号' : indicators?.kdj.signal === 'bearish' ? '死叉信号' : '中性'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 新闻列表 */}
          {news.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                相关新闻 ({news.length}条)
              </h3>
              <div className="space-y-3">
                {news.map((item, index) => (
                  <div key={item.id || index} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 hover:text-blue-600 block"
                    >
                      <p className="font-medium">{item.title}</p>
                      {item.summary && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {item.source} · {item.publishTime}
                      </p>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 分析报告 */}
          {aiReport && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI 综合分析报告
              </h3>
              <div className="bg-purple-50 rounded-lg p-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {aiReport}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                以上分析仅供参考，不构成投资建议。投资有风险，决策需谨慎。
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}