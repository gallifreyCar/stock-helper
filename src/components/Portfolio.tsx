// Portfolio 持仓管理页面

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { fetchStockQuotes, fetchFundNavs } from '../utils/api';
import { calculateStockPositionValue, calculateFundPositionValue, formatMoney, formatChange } from '../utils/calculator';
import type { StockPosition, FundPosition, StockQuote } from '../types';
import { generateId } from '../types';
import { AddPositionModal } from './AddPositionModal';

export function Portfolio() {
  const { data, setData } = useStorage();
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [fundNavs, setFundNavs] = useState<Map<string, { nav: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPosition, setEditPosition] = useState<StockPosition | FundPosition | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [positionType, setPositionType] = useState<'stock' | 'fund'>('stock');

  // 刷新行情
  const refreshQuotes = async () => {
    setLoading(true);
    const stockCodes = data.stockPositions.map(p => p.stockCode);
    if (stockCodes.length > 0) {
      const quotes = await fetchStockQuotes(stockCodes);
      setStockQuotes(new Map(quotes.map(q => [q.code, q])));
    }

    const fundCodes = data.fundPositions.map(p => p.fundCode);
    if (fundCodes.length > 0) {
      setFundNavs(await fetchFundNavs(fundCodes));
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshQuotes();
  }, []);

  // 删除持仓
  const deletePosition = (id: string, type: 'stock' | 'fund') => {
    if (type === 'stock') {
      setData({
        ...data,
        stockPositions: data.stockPositions.filter(p => p.id !== id),
      });
    } else {
      setData({
        ...data,
        fundPositions: data.fundPositions.filter(p => p.id !== id),
      });
    }
  };

  // 筛选持仓
  const filteredStocks = selectedAccount === 'all'
    ? data.stockPositions
    : data.stockPositions.filter(p => p.accountId === selectedAccount);

  const filteredFunds = selectedAccount === 'all'
    ? data.fundPositions
    : data.fundPositions.filter(p => p.accountId === selectedAccount);

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 账户筛选 */}
          <select
            value={selectedAccount}
            onChange={e => setSelectedAccount(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全部账户</option>
            {data.accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

          {/* 类型切换 */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setPositionType('stock')}
              className={`px-4 py-2 text-sm ${positionType === 'stock' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              股票
            </button>
            <button
              onClick={() => setPositionType('fund')}
              className={`px-4 py-2 text-sm ${positionType === 'fund' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              基金
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshQuotes}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            添加持仓
          </button>
        </div>
      </div>

      {/* 股票持仓列表 */}
      {positionType === 'stock' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">股票</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">买入价</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">现价</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盈亏</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无股票持仓
                  </td>
                </tr>
              ) : (
                filteredStocks.map(pos => {
                  const quote = stockQuotes.get(pos.stockCode);
                  const value = quote ? calculateStockPositionValue(pos, quote) : null;

                  return (
                    <tr key={pos.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{pos.stockName}</p>
                          <p className="text-xs text-gray-500">{pos.stockCode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.buyPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.quantity}</td>
                      <td className="px-4 py-3 text-sm">
                        {quote ? (
                          <div>
                            <p className="font-medium">{quote.price.toFixed(2)}</p>
                            <p className={`text-xs ${quote.changePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatChange(quote.changePercent)}
                            </p>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {value ? formatMoney(value.marketValue) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {value ? (
                          <div className={value.profit >= 0 ? 'text-red-600' : 'text-green-600'}>
                            <p className="font-medium">{value.profit >= 0 ? '+' : ''}{formatMoney(value.profit)}</p>
                            <p className="text-xs">{formatChange(value.profitPercent)}</p>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditPosition(pos);
                              setShowAddModal(true);
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePosition(pos.id, 'stock')}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 基金持仓列表 */}
      {positionType === 'fund' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基金</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">买入净值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">份额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前净值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盈亏</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无基金持仓
                  </td>
                </tr>
              ) : (
                filteredFunds.map(pos => {
                  const navData = fundNavs.get(pos.fundCode);
                  const nav = navData?.nav || pos.buyNav;
                  const value = calculateFundPositionValue(pos, nav);

                  return (
                    <tr key={pos.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{navData?.name || pos.fundName}</p>
                          <p className="text-xs text-gray-500">{pos.fundCode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.buyNav.toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.shares.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{nav.toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatMoney(value.marketValue)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className={value.profit >= 0 ? 'text-red-600' : 'text-green-600'}>
                          <p className="font-medium">{value.profit >= 0 ? '+' : ''}{formatMoney(value.profit)}</p>
                          <p className="text-xs">{formatChange(value.profitPercent)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditPosition(pos);
                              setShowAddModal(true);
                            }}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePosition(pos.id, 'fund')}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 添加/编辑持仓弹窗 */}
      {showAddModal && (
        <AddPositionModal
          type={positionType}
          editData={editPosition}
          accounts={data.accounts}
          onClose={() => {
            setShowAddModal(false);
            setEditPosition(null);
          }}
          onSave={(pos, type) => {
            if (type === 'stock') {
              const stockPos = pos as StockPosition;
              if (editPosition && 'stockCode' in editPosition) {
                setData({
                  ...data,
                  stockPositions: data.stockPositions.map(p =>
                    p.id === stockPos.id ? stockPos : p
                  ),
                });
              } else {
                setData({
                  ...data,
                  stockPositions: [...data.stockPositions, { ...stockPos, id: generateId() }],
                });
              }
            } else {
              const fundPos = pos as FundPosition;
              if (editPosition && 'fundCode' in editPosition) {
                setData({
                  ...data,
                  fundPositions: data.fundPositions.map(p =>
                    p.id === fundPos.id ? fundPos : p
                  ),
                });
              } else {
                setData({
                  ...data,
                  fundPositions: [...data.fundPositions, { ...fundPos, id: generateId() }],
                });
              }
            }
            setShowAddModal(false);
            setEditPosition(null);
          }}
        />
      )}
    </div>
  );
}