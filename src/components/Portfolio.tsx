// Portfolio 持仓管理页面 - 使用交易记录

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, History, Trash2 } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { fetchStockQuotes, fetchFundNavs } from '../utils/api';
import { calculateStockPositionValue, calculateFundPositionValue, formatMoney, formatChange } from '../utils/calculator';
import { calculateStockPositions, calculateFundPositions, generateId } from '../types';
import type { StockPositionSummary, FundPositionSummary, StockQuote, StockTransaction, FundTransaction } from '../types';
import { AddTransactionModal } from './AddTransactionModal';
import { TransactionHistory } from './TransactionHistory';

export function Portfolio() {
  const { data, setData } = useStorage();
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [fundNavs, setFundNavs] = useState<Map<string, { nav: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [positionType, setPositionType] = useState<'stock' | 'fund'>('stock');
  const [showHistory, setShowHistory] = useState<StockPositionSummary | FundPositionSummary | null>(null);

  // 计算持仓汇总
  const stockPositions = calculateStockPositions(data.stockTransactions);
  const fundPositions = calculateFundPositions(data.fundTransactions);

  // 刷新行情
  const refreshQuotes = async () => {
    setLoading(true);

    // 获取有持仓的股票代码
    const stockCodes = stockPositions.filter(p => p.totalQuantity > 0).map(p => p.stockCode);
    if (stockCodes.length > 0) {
      const quotes = await fetchStockQuotes(stockCodes);
      setStockQuotes(new Map(quotes.map(q => [q.code, q])));
    }

    // 获取有持仓的基金代码
    const fundCodes = fundPositions.filter(p => p.totalShares > 0).map(p => p.fundCode);
    if (fundCodes.length > 0) {
      setFundNavs(await fetchFundNavs(fundCodes));
    }

    setLoading(false);
  };

  useEffect(() => {
    async function fetchQuotes() {
      setLoading(true);

      // 获取有持仓的股票代码（重新计算确保最新）
      const positions = calculateStockPositions(data.stockTransactions);
      const fPositions = calculateFundPositions(data.fundTransactions);

      const stockCodes = positions.filter(p => p.totalQuantity > 0).map(p => p.stockCode);
      if (stockCodes.length > 0) {
        const quotes = await fetchStockQuotes(stockCodes);
        setStockQuotes(new Map(quotes.map(q => [q.code, q])));
      } else {
        setStockQuotes(new Map());
      }

      const fundCodes = fPositions.filter(p => p.totalShares > 0).map(p => p.fundCode);
      if (fundCodes.length > 0) {
        setFundNavs(await fetchFundNavs(fundCodes));
      } else {
        setFundNavs(new Map());
      }

      setLoading(false);
    }

    fetchQuotes();
  }, [data.stockTransactions, data.fundTransactions]);

  // 筛选持仓
  const filteredStocks = selectedAccount === 'all'
    ? stockPositions
    : stockPositions.filter(p => p.accountId === selectedAccount);

  const filteredFunds = selectedAccount === 'all'
    ? fundPositions
    : fundPositions.filter(p => p.accountId === selectedAccount);

  // 添加交易记录
  const addTransaction = (tx: StockTransaction | FundTransaction, type: 'stock' | 'fund') => {
    if (type === 'stock') {
      setData({
        ...data,
        stockTransactions: [...data.stockTransactions, tx as StockTransaction],
      });
    } else {
      setData({
        ...data,
        fundTransactions: [...data.fundTransactions, tx as FundTransaction],
      });
    }
  };

  // 删除交易记录
  const deleteTransaction = (id: string, type: 'stock' | 'fund') => {
    if (type === 'stock') {
      setData({
        ...data,
        stockTransactions: data.stockTransactions.filter(t => t.id !== id),
      });
    } else {
      setData({
        ...data,
        fundTransactions: data.fundTransactions.filter(t => t.id !== id),
      });
    }
  };

  // 更新交易记录
  const updateTransaction = (tx: StockTransaction | FundTransaction, type: 'stock' | 'fund') => {
    if (type === 'stock') {
      setData({
        ...data,
        stockTransactions: data.stockTransactions.map(t => t.id === tx.id ? tx as StockTransaction : t),
      });
    } else {
      setData({
        ...data,
        fundTransactions: data.fundTransactions.map(t => t.id === tx.id ? tx as FundTransaction : t),
      });
    }
  };

  // 删除整个持仓（清空所有交易记录）
  const deletePosition = (code: string, accountId: string, type: 'stock' | 'fund') => {
    if (type === 'stock') {
      setData({
        ...data,
        stockTransactions: data.stockTransactions.filter(t => t.stockCode !== code || t.accountId !== accountId),
      });
    } else {
      setData({
        ...data,
        fundTransactions: data.fundTransactions.filter(t => t.fundCode !== code || t.accountId !== accountId),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            添加交易
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成本价</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">现价</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盈亏</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStocks.filter(p => p.totalQuantity > 0).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无股票持仓
                  </td>
                </tr>
              ) : (
                filteredStocks.filter(p => p.totalQuantity > 0).map(pos => {
                  const quote = stockQuotes.get(pos.stockCode);
                  const value = quote ? calculateStockPositionValue(pos, quote.price) : null;

                  return (
                    <tr key={`${pos.accountId}-${pos.stockCode}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{pos.stockName}</p>
                          <p className="text-xs text-gray-500">{pos.stockCode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.avgPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.totalQuantity}</td>
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
                          <div>
                            <p className={`font-medium ${value.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {value.totalProfit >= 0 ? '+' : ''}{formatMoney(value.totalProfit)}
                            </p>
                            <p className={`text-xs ${value.unrealizedPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatChange(value.unrealizedPercent)}
                            </p>
                            {pos.realizedProfit !== 0 && (
                              <p className="text-xs text-gray-400">
                                已实现: {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                              </p>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowHistory(pos)}
                            className="text-gray-400 hover:text-blue-600"
                            title="交易记录"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePosition(pos.stockCode, pos.accountId, 'stock')}
                            className="text-gray-400 hover:text-red-600"
                            title="删除持仓"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成本净值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">份额</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前净值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">市值</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">盈亏</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFunds.filter(p => p.totalShares > 0).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无基金持仓
                  </td>
                </tr>
              ) : (
                filteredFunds.filter(p => p.totalShares > 0).map(pos => {
                  const navData = fundNavs.get(pos.fundCode);
                  const nav = navData?.nav || 0;
                  const value = nav > 0 ? calculateFundPositionValue(pos, nav) : null;

                  return (
                    <tr key={`${pos.accountId}-${pos.fundCode}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{navData?.name || pos.fundName}</p>
                          <p className="text-xs text-gray-500">{pos.fundCode}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.avgNav.toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{pos.totalShares.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{nav > 0 ? nav.toFixed(4) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {value ? formatMoney(value.marketValue) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {value ? (
                          <div>
                            <p className={`font-medium ${value.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {value.totalProfit >= 0 ? '+' : ''}{formatMoney(value.totalProfit)}
                            </p>
                            <p className={`text-xs ${value.unrealizedPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatChange(value.unrealizedPercent)}
                            </p>
                            {pos.realizedProfit !== 0 && (
                              <p className="text-xs text-gray-400">
                                已实现: {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                              </p>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowHistory(pos)}
                            className="text-gray-400 hover:text-blue-600"
                            title="交易记录"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePosition(pos.fundCode, pos.accountId, 'fund')}
                            className="text-gray-400 hover:text-red-600"
                            title="删除持仓"
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

      {/* 已清仓记录 */}
      {(filteredStocks.some(p => p.totalQuantity === 0 && p.realizedProfit !== 0) ||
        filteredFunds.some(p => p.totalShares === 0 && p.realizedProfit !== 0)) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">已清仓记录</h3>
          <div className="space-y-2">
            {filteredStocks.filter(p => p.totalQuantity === 0 && p.realizedProfit !== 0).map(pos => {
            const buyCount = pos.transactions.filter(t => t.type === 'buy').length;
            const sellCount = pos.transactions.filter(t => t.type === 'sell').length;
            return (
              <div key={`sold-${pos.stockCode}`} className="flex items-center justify-between py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 rounded px-2" onClick={() => setShowHistory(pos)}>
                <div>
                  <span className="text-sm">{pos.stockName} ({pos.stockCode})</span>
                  <span className="text-xs text-gray-400 ml-2">买入{buyCount}次 / 卖出{sellCount}次</span>
                </div>
                <span className={`text-sm font-medium ${pos.realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  已实现盈亏: {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                </span>
              </div>
            );
          })}
            {filteredFunds.filter(p => p.totalShares === 0 && p.realizedProfit !== 0).map(pos => {
            const buyCount = pos.transactions.filter(t => t.type === 'buy').length;
            const sellCount = pos.transactions.filter(t => t.type === 'sell').length;
            return (
              <div key={`sold-${pos.fundCode}`} className="flex items-center justify-between py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-100 rounded px-2" onClick={() => setShowHistory(pos)}>
                <div>
                  <span className="text-sm">{pos.fundName} ({pos.fundCode})</span>
                  <span className="text-xs text-gray-400 ml-2">买入{buyCount}次 / 卖出{sellCount}次</span>
                </div>
                <span className={`text-sm font-medium ${pos.realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  已实现盈亏: {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* 添加交易弹窗 */}
      {showAddModal && (
        <AddTransactionModal
          type={positionType}
          accountId={selectedAccount === 'all' ? data.accounts[0].id : selectedAccount}
          accounts={data.accounts}
          onClose={() => setShowAddModal(false)}
          onSave={(tx, txType) => {
            addTransaction({ ...tx, id: generateId() }, txType);
            setShowAddModal(false);
          }}
        />
      )}

      {/* 交易记录弹窗 */}
      {showHistory && (
        <TransactionHistory
          type={positionType}
          position={showHistory}
          accounts={data.accounts}
          currentPrice={stockQuotes.get((showHistory as StockPositionSummary).stockCode)?.price}
          currentNav={fundNavs.get((showHistory as FundPositionSummary).fundCode)?.nav}
          onClose={() => setShowHistory(null)}
          onAddTransaction={(tx) => addTransaction(tx, positionType)}
          onDeleteTransaction={(id) => deleteTransaction(id, positionType)}
          onUpdateTransaction={(tx) => updateTransaction(tx, positionType)}
        />
      )}
    </div>
  );
}