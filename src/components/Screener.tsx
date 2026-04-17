// Screener 股票筛选器 - 支持AI分析

import { useState, useEffect } from 'react';
import { Filter, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface StockAnalysis {
  code: string;
  name: string;
  industry: string;
  financial: {
    pe: number | null;
    pb: number | null;
    roe: number | null;
    marketCap: number | null;
    dividendRate: number | null;
  };
  analysis: string;
  analyzedAt: string;
}

export function Screener() {
  const [stockData, setStockData] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockAnalysis | null>(null);

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

  // 加载股票数据
  useEffect(() => {
    fetch('/stock-helper/data/stock-analysis.json')
      .then(res => res.json())
      .then(data => {
        setStockData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('加载股票数据失败:', err);
        setLoading(false);
      });
  }, []);

  // 获取行业列表
  const industries = ['全部', ...new Set(stockData.map(s => s.industry))];

  // 筛选股票
  const filteredStocks = stockData
    .filter(stock => {
      if (stock.industry === 'ETF') return criteria.industry === 'ETF' || criteria.industry === '全部';
      if (criteria.industry !== '全部' && stock.industry !== criteria.industry) return false;
      if (criteria.peMin !== null && stock.financial.pe !== null && stock.financial.pe < criteria.peMin) return false;
      if (criteria.peMax !== null && stock.financial.pe !== null && stock.financial.pe > criteria.peMax) return false;
      if (criteria.pbMin !== null && stock.financial.pb !== null && stock.financial.pb < criteria.pbMin) return false;
      if (criteria.pbMax !== null && stock.financial.pb !== null && stock.financial.pb > criteria.pbMax) return false;
      if (criteria.roeMin !== null && stock.financial.roe !== null && stock.financial.roe < criteria.roeMin) return false;
      if (criteria.marketCapMin !== null && stock.financial.marketCap !== null && stock.financial.marketCap < criteria.marketCapMin) return false;
      if (criteria.marketCapMax !== null && stock.financial.marketCap !== null && stock.financial.marketCap > criteria.marketCapMax) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a.financial[sortBy] || 0;
      const bVal = b.financial[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // 快速筛选模板
  const quickFilters = [
    { label: '低估值', criteria: { peMax: 10, pbMax: 1.5 } },
    { label: '高ROE', criteria: { roeMin: 15 } },
    { label: '大盘股', criteria: { marketCapMin: 1000 } },
    { label: '高分红', criteria: {} }, // 需要数据支持
    { label: '银行股', criteria: { industry: '银行' } },
    { label: 'ETF', criteria: { industry: 'ETF' } },
  ];

  const applyQuickFilter = (filter: Partial<typeof criteria>) => {
    setCriteria({ ...criteria, industry: '全部', ...filter });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">加载股票数据中...</p>
      </div>
    );
  }

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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值</th>
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
                    {stock.financial.pe ? (
                      <span className={stock.financial.pe < 15 ? 'text-green-600' : stock.financial.pe > 30 ? 'text-red-600' : 'text-gray-900'}>
                        {stock.financial.pe.toFixed(1)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {stock.financial.pb ? (
                      <span className={stock.financial.pb < 1 ? 'text-green-600' : stock.financial.pb > 3 ? 'text-red-600' : 'text-gray-900'}>
                        {stock.financial.pb.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {stock.financial.roe ? (
                      <span className={stock.financial.roe > 20 ? 'text-red-600 font-medium' : stock.financial.roe > 10 ? 'text-gray-900' : 'text-gray-500'}>
                        {stock.financial.roe.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {stock.financial.marketCap ? `${stock.financial.marketCap}亿` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedStock(stock)}
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
      </div>

      {/* AI分析弹窗 */}
      {selectedStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
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
                  <p className="text-lg font-bold">{selectedStock.financial.pe || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">PB</p>
                  <p className="text-lg font-bold">{selectedStock.financial.pb || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">ROE</p>
                  <p className="text-lg font-bold">{selectedStock.financial.roe ? `${selectedStock.financial.roe}%` : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">市值</p>
                  <p className="text-lg font-bold">{selectedStock.financial.marketCap ? `${selectedStock.financial.marketCap}亿` : '-'}</p>
                </div>
              </div>

              {/* AI分析 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedStock.analysis}
                </p>
              </div>

              <p className="text-xs text-gray-400 mt-4 text-center">
                ⚠️ 以上为数据分析摘要，仅供参考，不构成投资建议
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        数据每周自动更新。PE&lt;15 或 PB&lt;1 标为绿色表示估值较低。分析由AI生成，仅供参考。
      </p>
    </div>
  );
}