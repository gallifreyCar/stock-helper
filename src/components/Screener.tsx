// Screener 股票筛选器

import { useState } from 'react';
import { Filter, TrendingUp, TrendingDown } from 'lucide-react';

// 预生成的股票基础数据示例
const stockBasics = [
  { code: '600000', name: '浦发银行', industry: '银行', pe: 5.2, pb: 0.45, roe: 11.5, marketCap: 850 },
  { code: '600036', name: '招商银行', industry: '银行', pe: 6.8, pb: 0.85, roe: 15.2, marketCap: 3200 },
  { code: '601318', name: '中国平安', industry: '保险', pe: 8.5, pb: 1.2, roe: 12.8, marketCap: 4500 },
  { code: '600519', name: '贵州茅台', industry: '白酒', pe: 28, pb: 8.5, roe: 32, marketCap: 18000 },
  { code: '000858', name: '五粮液', industry: '白酒', pe: 22, pb: 6.2, roe: 25, marketCap: 5500 },
  { code: '000001', name: '平安银行', industry: '银行', pe: 6.5, pb: 0.65, roe: 10.5, marketCap: 1800 },
  { code: '002415', name: '海康威视', industry: '电子', pe: 18, pb: 3.5, roe: 22, marketCap: 2800 },
  { code: '300750', name: '宁德时代', industry: '电池', pe: 35, pb: 5.8, roe: 18, marketCap: 8500 },
  { code: '601012', name: '隆基绿能', industry: '光伏', pe: 12, pb: 2.8, roe: 20, marketCap: 1800 },
  { code: '002594', name: '比亚迪', industry: '汽车', pe: 45, pb: 8.5, roe: 12, marketCap: 6000 },
];

interface FilterCriteria {
  industry: string;
  peMin: number | null;
  peMax: number | null;
  pbMin: number | null;
  pbMax: number | null;
  roeMin: number | null;
  marketCapMin: number | null;
  marketCapMax: number | null;
}

const industries = ['全部', '银行', '保险', '白酒', '电子', '电池', '光伏', '汽车'];

export function Screener() {
  const [criteria, setCriteria] = useState<FilterCriteria>({
    industry: '全部',
    peMin: null,
    peMax: null,
    pbMin: null,
    pbMax: null,
    roeMin: null,
    marketCapMin: null,
    marketCapMax: null,
  });

  const [sortBy, setSortBy] = useState<'pe' | 'pb' | 'roe' | 'marketCap'>('roe');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 筛选股票
  const filteredStocks = stockBasics
    .filter(stock => {
      if (criteria.industry !== '全部' && stock.industry !== criteria.industry) return false;
      if (criteria.peMin !== null && stock.pe < criteria.peMin) return false;
      if (criteria.peMax !== null && stock.pe > criteria.peMax) return false;
      if (criteria.pbMin !== null && stock.pb < criteria.pbMin) return false;
      if (criteria.pbMax !== null && stock.pb > criteria.pbMax) return false;
      if (criteria.roeMin !== null && stock.roe < criteria.roeMin) return false;
      if (criteria.marketCapMin !== null && stock.marketCap < criteria.marketCapMin) return false;
      if (criteria.marketCapMax !== null && stock.marketCap > criteria.marketCapMax) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  // 快速筛选模板
  const quickFilters = [
    { label: '低估值', criteria: { peMax: 10, pbMax: 1 } },
    { label: '高ROE', criteria: { roeMin: 15 } },
    { label: '大盘股', criteria: { marketCapMin: 1000 } },
    { label: '银行股', criteria: { industry: '银行' } },
  ];

  const applyQuickFilter = (filter: Partial<FilterCriteria>) => {
    setCriteria({ ...criteria, ...filter });
  };

  return (
    <div className="space-y-6">
      {/* 快速筛选 */}
      <div className="flex gap-2">
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
              placeholder="如 15%"
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStocks.map(stock => (
              <tr key={stock.code} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{stock.name}</p>
                    <p className="text-xs text-gray-500">{stock.code}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{stock.industry}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={stock.pe < 15 ? 'text-green-600' : stock.pe > 30 ? 'text-red-600' : 'text-gray-900'}>
                    {stock.pe.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={stock.pb < 1 ? 'text-green-600' : stock.pb > 3 ? 'text-red-600' : 'text-gray-900'}>
                    {stock.pb.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={stock.roe > 20 ? 'text-red-600 font-medium' : stock.roe > 10 ? 'text-gray-900' : 'text-gray-500'}>
                    {stock.roe.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{stock.marketCap}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStocks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            暂无符合条件的股票
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        数据仅供参考，实际投资请自行判断。PE&lt;15 或 PB&lt;1 标为绿色表示估值较低。
      </p>
    </div>
  );
}