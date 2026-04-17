// 添加交易记录弹窗 - 优化UI

import { useState, useEffect } from 'react';
import { X, Search, ArrowUpDown } from 'lucide-react';
import { fetchStockQuote, fetchFundNav } from '../utils/api';
import type { StockTransaction, FundTransaction, Account } from '../types';

interface AddTransactionModalProps {
  type: 'stock' | 'fund';
  accountId: string;
  accounts: Account[];
  existingCode?: string;
  existingName?: string;
  onClose: () => void;
  onSave: (transaction: StockTransaction | FundTransaction, type: 'stock' | 'fund') => void;
}

export function AddTransactionModal({ type, accountId, accounts, existingCode, existingName, onClose, onSave }: AddTransactionModalProps) {
  const [code, setCode] = useState(existingCode || '');
  const [name, setName] = useState(existingName || '');
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || accounts[0]?.id || '');
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  // 股票相关
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [fee, setFee] = useState('0');
  const [inputMode, setInputMode] = useState<'quantity' | 'amount'>('quantity');

  // 基金相关
  const [nav, setNav] = useState('');
  const [shares, setShares] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundFee, setFundFee] = useState('0');
  const [fundInputMode, setFundInputMode] = useState<'amount' | 'shares'>('amount');

  // 初始化时如果有代码就搜索
  useEffect(() => {
    if (existingCode && !existingName) {
      handleSearch();
    }
  }, []);

  // 股票双向换算
  useEffect(() => {
    if (type === 'stock' && price) {
      const p = parseFloat(price) || 0;
      if (inputMode === 'quantity' && quantity) {
        setTotalAmount((p * parseInt(quantity)).toFixed(2));
      } else if (inputMode === 'amount' && totalAmount) {
        setQuantity(Math.floor(parseFloat(totalAmount) / p).toString());
      }
    }
  }, [price, quantity, totalAmount, inputMode, type]);

  // 基金双向换算
  useEffect(() => {
    if (type === 'fund' && nav) {
      const n = parseFloat(nav) || 0;
      if (fundInputMode === 'amount' && fundAmount) {
        setShares((parseFloat(fundAmount) / n).toFixed(2));
      } else if (fundInputMode === 'shares' && shares) {
        setFundAmount((n * parseFloat(shares)).toFixed(2));
      }
    }
  }, [nav, shares, fundAmount, fundInputMode, type]);

  // 搜索
  const handleSearch = async () => {
    if (!code) return;
    setSearching(true);
    setError('');

    try {
      if (type === 'stock') {
        const quote = await fetchStockQuote(code);
        if (quote) {
          setName(quote.name);
          if (!price) setPrice(quote.price.toString());
        } else {
          setError('未找到该股票');
        }
      } else {
        const navData = await fetchFundNav(code);
        if (navData) {
          setName(navData.name);
          if (!nav) setNav(navData.nav.toString());
        } else {
          setError('未找到该基金');
        }
      }
    } catch (e) {
      setError('查询失败');
    }
    setSearching(false);
  };

  // 保存
  const handleSave = () => {
    if (!code || !name || !selectedAccountId) {
      setError('请填写完整信息');
      return;
    }

    if (type === 'stock') {
      if (!price || !quantity) {
        setError('请填写价格和数量');
        return;
      }
      const tx: StockTransaction = {
        id: '',
        accountId: selectedAccountId,
        stockCode: code,
        stockName: name,
        type: txType,
        date,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        fee: parseFloat(fee) || 0,
        amount: parseFloat(price) * parseInt(quantity),
      };
      onSave(tx, 'stock');
    } else {
      if (!nav || !shares) {
        setError('请填写净值和份额');
        return;
      }
      const tx: FundTransaction = {
        id: '',
        accountId: selectedAccountId,
        fundCode: code,
        fundName: name,
        type: txType,
        date,
        nav: parseFloat(nav),
        shares: parseFloat(shares),
        amount: parseFloat(fundAmount) || parseFloat(nav) * parseFloat(shares),
        fee: parseFloat(fundFee) || 0,
      };
      onSave(tx, 'fund');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            添加{type === 'stock' ? '股票' : '基金'}交易
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 买入/卖出切换 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTxType('buy')}
              className={`flex-1 py-2.5 rounded-md font-medium transition-all ${txType === 'buy' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              买入
            </button>
            <button
              onClick={() => setTxType('sell')}
              className={`flex-1 py-2.5 rounded-md font-medium transition-all ${txType === 'sell' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              卖出
            </button>
          </div>

          {/* 代码搜索 */}
          {!existingCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">代码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={type === 'stock' ? '股票代码 如 600000' : '基金代码 如 000001'}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Search className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>
          )}

          {/* 名称显示 */}
          {name && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <span className="text-green-700 font-medium">{name}</span>
              <span className="text-green-600 text-sm ml-2">{code}</span>
            </div>
          )}

          {/* 账户和日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">账户</label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 股票交易表单 */}
          {type === 'stock' && (
            <>
              {/* 价格 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">成交价</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                />
              </div>

              {/* 数量/金额 换算 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数量 / 金额
                  <button
                    onClick={() => setInputMode(inputMode === 'quantity' ? 'amount' : 'quantity')}
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    <ArrowUpDown className="w-4 h-4 inline" />
                    切换
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => { setQuantity(e.target.value); setInputMode('quantity'); }}
                      placeholder="股数"
                      disabled={inputMode === 'amount'}
                      className={`w-full px-4 py-3 border rounded-lg text-lg ${inputMode === 'amount' ? 'bg-gray-100 border-gray-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">股</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={e => { setTotalAmount(e.target.value); setInputMode('amount'); }}
                      placeholder="金额"
                      disabled={inputMode === 'quantity'}
                      className={`w-full px-4 py-3 border rounded-lg text-lg ${inputMode === 'quantity' ? 'bg-gray-100 border-gray-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">元</span>
                  </div>
                </div>
              </div>

              {/* 手续费 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手续费</label>
                <input
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* 基金交易表单 */}
          {type === 'fund' && (
            <>
              {/* 净值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">成交净值</label>
                <input
                  type="number"
                  step="0.0001"
                  value={nav}
                  onChange={e => setNav(e.target.value)}
                  placeholder="1.0000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                />
              </div>

              {/* 金额/份额 换算 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  金额 / 份额
                  <button
                    onClick={() => setFundInputMode(fundInputMode === 'amount' ? 'shares' : 'amount')}
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    <ArrowUpDown className="w-4 h-4 inline" />
                    切换
                  </button>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={e => { setFundAmount(e.target.value); setFundInputMode('amount'); }}
                      placeholder="金额"
                      disabled={fundInputMode === 'shares'}
                      className={`w-full px-4 py-3 border rounded-lg text-lg ${fundInputMode === 'shares' ? 'bg-gray-100 border-gray-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">元</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={shares}
                      onChange={e => { setShares(e.target.value); setFundInputMode('shares'); }}
                      placeholder="份额"
                      disabled={fundInputMode === 'amount'}
                      className={`w-full px-4 py-3 border rounded-lg text-lg ${fundInputMode === 'amount' ? 'bg-gray-100 border-gray-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">份</span>
                  </div>
                </div>
              </div>

              {/* 手续费 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {txType === 'buy' ? '申购费' : '赎回费'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fundFee}
                  onChange={e => setFundFee(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {txType === 'buy' ? '申购费率通常为0.1%-1.5%' : '赎回费率根据持有时间递减'}
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-lg font-medium text-white ${txType === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {txType === 'buy' ? '确认买入' : '确认卖出'}
          </button>
        </div>
      </div>
    </div>
  );
}