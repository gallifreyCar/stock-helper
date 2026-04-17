// 交易记录历史组件

import { useState } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { StockTransaction, FundTransaction, StockPositionSummary, FundPositionSummary, Account } from '../types';
import { generateId } from '../types';
import { formatMoney, formatDate } from '../utils/calculator';
import { AddTransactionModal } from './AddTransactionModal';

interface TransactionHistoryProps {
  type: 'stock' | 'fund';
  position: StockPositionSummary | FundPositionSummary;
  accounts: Account[];
  currentPrice?: number;
  currentNav?: number;
  onClose: () => void;
  onAddTransaction: (tx: StockTransaction | FundTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionHistory({
  type,
  position,
  accounts,
  currentPrice,
  currentNav,
  onClose,
  onAddTransaction,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const transactions = position.transactions;
  const realizedProfit = position.realizedProfit;

  // 计算当前盈亏
  let unrealizedProfit = 0;
  let currentHolding = '';
  let avgCost = '';

  if (type === 'stock') {
    const sp = position as StockPositionSummary;
    if (currentPrice) {
      unrealizedProfit = currentPrice * sp.totalQuantity - sp.totalCost;
    }
    currentHolding = `${sp.totalQuantity}股`;
    avgCost = sp.avgPrice.toFixed(2);
  } else {
    const fp = position as FundPositionSummary;
    if (currentNav) {
      unrealizedProfit = currentNav * fp.totalShares - fp.totalCost;
    }
    currentHolding = `${fp.totalShares.toFixed(2)}份`;
    avgCost = fp.avgNav.toFixed(4);
  }

  const totalProfit = realizedProfit + unrealizedProfit;

  // 获取名称和代码
  const name = type === 'stock' ? (position as StockPositionSummary).stockName : (position as FundPositionSummary).fundName;
  const code = type === 'stock' ? (position as StockPositionSummary).stockCode : (position as FundPositionSummary).fundCode;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{name}</h2>
            <p className="text-white/80 text-sm">{code}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 盈亏汇总 */}
        <div className="bg-gray-50 p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">累计投入</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(position.totalCost)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">已实现盈亏</p>
            <p className={`text-lg font-bold ${realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {realizedProfit >= 0 ? '+' : ''}{formatMoney(realizedProfit)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">总盈亏</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalProfit >= 0 ? '+' : ''}{formatMoney(totalProfit)}
            </p>
          </div>
        </div>

        {/* 当前持仓 */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">当前持仓</p>
            <p className="text-base font-medium">
              {currentHolding}
              <span className="text-gray-400 ml-2">
                成本价 {avgCost}
              </span>
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            新增交易
          </button>
        </div>

        {/* 交易流水 */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">价格</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">数量</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">金额</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">手续费</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无交易记录
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${tx.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.type === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {tx.type === 'buy' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {type === 'stock' ? (tx as StockTransaction).price.toFixed(2) : (tx as FundTransaction).nav.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {type === 'stock' ? (tx as StockTransaction).quantity : (tx as FundTransaction).shares.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatMoney(tx.amount)}</td>
                    <td className="px-4 py-3 text-sm">{formatMoney(tx.fee || 0)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Transaction Modal */}
        {showAddModal && (
          <AddTransactionModal
            type={type}
            accountId={position.accountId}
            accounts={accounts}
            existingCode={code}
            existingName={name}
            onClose={() => setShowAddModal(false)}
            onSave={(tx) => {
              onAddTransaction({ ...tx, id: generateId() });
              setShowAddModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}