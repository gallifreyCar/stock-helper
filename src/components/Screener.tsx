// Screener 股票筛选器 - 支持实时AI分析

import { useState, useEffect } from 'react';
import { Filter, TrendingUp, TrendingDown, Sparkles, Settings, Loader2 } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { AI_PROVIDERS, type AIConfig } from '../types';

// 本地股票基础数据（无API时使用）
const LOCAL_STOCK_DATA: Array<{
  code: string;
  name: string;
  industry: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  marketCap: number | null;
  pregeneratedAnalysis?: string;
}> = [
  { code: '600036', name: '招商银行', industry: '银行', pe: 6.8, pb: 0.85, roe: 15.2, marketCap: 3200 },
  { code: '601318', name: '中国平安', industry: '保险', pe: 8.5, pb: 1.2, roe: 12.8, marketCap: 4500 },
  { code: '600000', name: '浦发银行', industry: '银行', pe: 5.2, pb: 0.45, roe: 11.5, marketCap: 850 },
  { code: '601398', name: '工商银行', industry: '银行', pe: 5.5, pb: 0.55, roe: 10.8, marketCap: 1800 },
  { code: '600519', name: '贵州茅台', industry: '白酒', pe: 28, pb: 8.5, roe: 32, marketCap: 18000 },
  { code: '000858', name: '五粮液', industry: '白酒', pe: 22, pb: 6.2, roe: 25, marketCap: 5500 },
  { code: '002415', name: '海康威视', industry: '电子', pe: 18, pb: 3.5, roe: 22, marketCap: 2800 },
  { code: '300750', name: '宁德时代', industry: '电池', pe: 35, pb: 5.8, roe: 18, marketCap: 8500 },
  { code: '601012', name: '隆基绿能', industry: '光伏', pe: 12, pb: 2.8, roe: 20, marketCap: 1800 },
  { code: '002594', name: '比亚迪', industry: '汽车', pe: 45, pb: 8.5, roe: 12, marketCap: 6000 },
  { code: '513130', name: '恒生科技ETF', industry: 'ETF', pe: null, pb: null, roe: null, marketCap: null },
  { code: '510300', name: '沪深300ETF', industry: 'ETF', pe: null, pb: null, roe: null, marketCap: null },
];

export function Screener() {
  const { data } = useStorage();
  const [stockData, setStockData] = useState(LOCAL_STOCK_DATA);
  const [selectedStock, setSelectedStock] = useState<typeof LOCAL_STOCK_DATA[0] | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');

  const [criteria, setCriteria] = useState({
    industry: '全部',
    peMin: null as number | null,
    peMax: null as number | null,
    pbMin: null as number | null,
    pbMax: null as number | null,
    roeMin: null as number | null,
    marketCapMin: null as number | null,
    marketCapMax: null as number | null,
  });

  const [sortBy, setSortBy] = useState<'pe' | 'pb' | 'roe' | 'marketCap'>('roe');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 尝试加载预生成的分析数据
  useEffect(() => {
    fetch('/stock-helper/data/stock-analysis.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const merged = LOCAL_STOCK_DATA.map(local => {
            const found = data.find((d: any) => d.code === local.code);
            return found ? { ...local, pregeneratedAnalysis: found.analysis } : local;
          });
          setStockData(merged);
        }
      })
      .catch(() => {
        // 使用本地数据
      });
  }, []);

  // 获取行业列表
  const industries = ['全部', ...new Set(stockData.map(s => s.industry))];

  // 筛选股票
  const filteredStocks = stockData
    .filter(stock => {
      if (stock.industry === 'ETF') return criteria.industry === 'ETF' || criteria.industry === '全部';
      if (criteria.industry !== '全部' && stock.industry !== criteria.industry) return false;
      if (criteria.peMin !== null && stock.pe !== null && stock.pe < criteria.peMin) return false;
      if (criteria.peMax !== null && stock.pe !== null && stock.pe > criteria.peMax) return false;
      if (criteria.pbMin !== null && stock.pb !== null && stock.pb < criteria.pbMin) return false;
      if (criteria.pbMax !== null && stock.pb !== null && stock.pb > criteria.pbMax) return false;
      if (criteria.roeMin !== null && stock.roe !== null && stock.roe < criteria.roeMin) return false;
      if (criteria.marketCapMin !== null && stock.marketCap !== null && stock.marketCap < criteria.marketCapMin) return false;
      if (criteria.marketCapMax !== null && stock.marketCap !== null && stock.marketCap > criteria.marketCapMax) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // 快速筛选模板
  const quickFilters = [
    { label: '低估值', criteria: { peMax: 15, pbMax: 1.5 } },
    { label: '高ROE', criteria: { roeMin: 15 } },
    { label: '大盘股', criteria: { marketCapMin: 1000 } },
    { label: '银行股', criteria: { industry: '银行' } },
    { label: 'ETF', criteria: { industry: 'ETF' } },
  ];

  const applyQuickFilter = (filter: Partial<typeof criteria>) => {
    setCriteria({ ...criteria, industry: '全部', ...filter });
  };

  // 调用AI获取分析
  const fetchAiAnalysis = async (stock: typeof LOCAL_STOCK_DATA[0]) => {
    const aiConfig: AIConfig | undefined = data.settings.aiConfig;

    if (!aiConfig?.apiKey) {
      // 如果有预生成的分析，显示它
      if (stock.pregeneratedAnalysis) {
        setAiAnalysis(stock.pregeneratedAnalysis);
        return;
      }
      setAnalysisError('请先在「设置」页面配置API Key');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');
    setAiAnalysis('');

    const provider = AI_PROVIDERS[aiConfig.provider];
    const baseUrl = aiConfig.baseUrl || provider.baseUrl;
    const model = aiConfig.model || provider.defaultModel;

    const prompt = `
请分析以下A股的财务指标，给出数据分析摘要（注意：这是数据分析，不是投资建议）：

股票：${stock.name} (${stock.code})
行业：${stock.industry}
PE（市盈率）：${stock.pe || '无数据'}
PB（市净率）：${stock.pb || '无数据'}
ROE（净资产收益率）：${stock.roe || '无数据'}%
市值：${stock.marketCap || '无数据'}亿

请用2-3句话简要分析：
1. 估值水平（PE/PB在行业中处于什么位置）
2. 盈利能力（ROE表现）
3. 适合什么类型的投资者

回复要简洁，不要说"建议买入"之类的投资建议。
`;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setAnalysisError(err.error?.message || 'API调用失败');
        return;
      }

      const result = await response.json();
      const analysis = result.choices?.[0]?.message?.content || '';
      setAiAnalysis(analysis.trim());
    } catch (e: any) {
      setAnalysisError(e.message || '网络错误');
    } finally {
      setAnalyzing(false);
    }
  };

  // 打开分析弹窗
  const openAnalysis = (stock: typeof LOCAL_STOCK_DATA[0]) => {
    setSelectedStock(stock);
    setAiAnalysis('');
    setAnalysisError('');
    fetchAiAnalysis(stock);
  };

  return (
    <div className="space-y-6">
      {/* 快速筛选 */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map(f => (
          <button
            key={f.label}
            onClick={() => applyQuickFilter(f.criteria)}
            className="px-3 py-2 bg-gray-100 hover:bg-blue-100 rounded-md text-sm"
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setCriteria({
            industry: '全部',
            peMin: null,
            peMax: null,
            pbMin: null,
            pbMax: null,
            roeMin: null,
            marketCapMin: null,
            marketCapMax: null,
          })}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          清除筛选
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          筛选条件
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">行业</label>
            <select
              value={criteria.industry}
              onChange={e => setCriteria({ ...criteria, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {industries.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">PE范围</label>
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="最小"
                value={criteria.peMin ?? ''}
                onChange={e => setCriteria({ ...criteria, peMin: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-1/2 px-2 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="最大"
                value={criteria.peMax ?? ''}
                onChange={e => setCriteria({ ...criteria, peMax: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-1/2 px-2 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">PB范围</label>
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="最小"
                value={criteria.pbMin ?? ''}
                onChange={e => setCriteria({ ...criteria, pbMin: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-1/2 px-2 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="最大"
                value={criteria.pbMax ?? ''}
                onChange={e => setCriteria({ ...criteria, pbMax: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-1/2 px-2 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">ROE最低</label>
            <input
              type="number"
              placeholder="如 15"
              value={criteria.roeMin ?? ''}
              onChange={e => setCriteria({ ...criteria, roeMin: e.target.value ? parseFloat(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* 筛选结果 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold">筛选结果 ({filteredStocks.length}只)</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">排序:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="roe">ROE</option>
              <option value="pe">PE</option>
              <option value="pb">PB</option>
              <option value="marketCap">市值</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sortOrder === 'desc' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">行业</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PE</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PB</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROE</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值(亿)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI分析</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无符合条件的股票
                </td>
              </tr>
            ) : (
              filteredStocks.map(stock => (
                <tr key={stock.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{stock.name}</p>
                      <p className="text-xs text-gray-500">{stock.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{stock.industry}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={stock.pe && stock.pe < 15 ? 'text-green-600' : stock.pe && stock.pe > 30 ? 'text-red-600' : 'text-gray-900'}>
                      {stock.pe ? stock.pe.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={stock.pb && stock.pb < 1 ? 'text-green-600' : stock.pb && stock.pb > 3 ? 'text-red-600' : 'text-gray-900'}>
                      {stock.pb ? stock.pb.toFixed(2) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={stock.roe && stock.roe > 20 ? 'text-red-600 font-medium' : stock.roe && stock.roe > 10 ? 'text-gray-900' : 'text-gray-500'}>
                      {stock.roe ? `${stock.roe.toFixed(1)}%` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{stock.marketCap || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openAnalysis(stock)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredStocks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            暂无符合条件的股票
          </div>
        )}
      </div>

      {/* AI分析弹窗 */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedStock.name}</h2>
                <p className="text-white/80 text-sm">{selectedStock.code} · {selectedStock.industry}</p>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {/* 财务指标 */}
              <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">PE</p>
                  <p className="text-lg font-bold">{selectedStock.pe || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">PB</p>
                  <p className="text-lg font-bold">{selectedStock.pb || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">ROE</p>
                  <p className="text-lg font-bold">{selectedStock.roe ? `${selectedStock.roe}%` : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">市值</p>
                  <p className="text-lg font-bold">{selectedStock.marketCap ? `${selectedStock.marketCap}亿` : '-'}</p>
                </div>
              </div>

              {/* AI分析内容 */}
              {analyzing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">AI正在分析...</span>
                </div>
              ) : analysisError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{analysisError}</p>
                  {!data.settings.aiConfig?.apiKey && (
                    <button
                      onClick={() => {
                        setSelectedStock(null);
                        window.location.hash = '/settings';
                      }}
                      className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Settings className="w-4 h-4" />
                      前去配置API Key
                    </button>
                  )}
                </div>
              ) : aiAnalysis ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis}</p>
                </div>
              ) : null}

              <p className="text-xs text-gray-400 mt-4 text-center">
                ⚠️ 以上为数据分析摘要，仅供参考，不构成投资建议
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        PE&lt;15 或 PB&lt;1 标为绿色表示估值较低。点击「AI分析」可获取实时分析（需配置API Key）。
      </p>
    </div>
  );
}