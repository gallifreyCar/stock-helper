// 添加/编辑持仓弹窗 - 支持双向换算

import { useState, useEffect } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';
import { fetchStockQuote, fetchFundNav } from '../utils/api';
import type { StockPosition, FundPosition, Account } from '../types';

interface AddPositionModalProps {
  type: 'stock' | 'fund';
  editData: StockPosition | FundPosition | null;
  accounts: Account[];
  onClose: () => void;
  onSave: (position: StockPosition | FundPosition, type: 'stock' | 'fund') => void;
}

export function AddPositionModal({ type, editData, accounts, onClose, onSave }: AddPositionModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  // 股票相关
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [fee, setFee] = useState('0');
  const [inputMode, setInputMode] = useState<'quantity' | 'amount'>('quantity');

  // 基金相关
  const [buyNav, setBuyNav] = useState('');
  const [shares, setShares] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundInputMode, setFundInputMode] = useState<'shares' | 'amount'>('amount');

  // 编辑模式初始化
  useEffect(() => {
    if (editData) {
      setAccountId(editData.accountId);
      setBuyDate(editData.buyDate);
      if (type === 'stock' && 'stockCode' in editData) {
        setCode(editData.stockCode);
        setName(editData.stockName);
        setBuyPrice(editData.buyPrice.toString());
        setQuantity(editData.quantity.toString());
        const amount = editData.buyPrice * editData.quantity;
        setTotalAmount(amount.toFixed(2));
        setFee(editData.fee.toString());
      } else if (type === 'fund' && 'fundCode' in editData) {
        setCode(editData.fundCode);
        setName(editData.fundName);
        setBuyNav(editData.buyNav.toString());
        setShares(editData.shares.toString());
        setFundAmount(editData.amount.toString());
      }
    }
  }, [editData, type]);

  // 股票双向换算
  useEffect(() => {
    if (type === 'stock' && buyPrice) {
      const price = parseFloat(buyPrice) || 0;
      if (inputMode === 'quantity' && quantity) {
        const qty = parseFloat(quantity) || 0;
        setTotalAmount((price * qty).toFixed(2));
      } else if (inputMode === 'amount' && totalAmount) {
        const amt = parseFloat(totalAmount) || 0;
        setQuantity(Math.floor(amt / price).toString());
      }
    }
  }, [buyPrice, quantity, totalAmount, inputMode, type]);

  // 基金双向换算
  useEffect(() => {
    if (type === 'fund' && buyNav) {
      const nav = parseFloat(buyNav) || 0;
      if (fundInputMode === 'amount' && fundAmount) {
        const amt = parseFloat(fundAmount) || 0;
        setShares((amt / nav).toFixed(2));
      } else if (fundInputMode === 'shares' && shares) {
        const sh = parseFloat(shares) || 0;
        setFundAmount((nav * sh).toFixed(2));
      }
    }
  }, [buyNav, shares, fundAmount, fundInputMode, type]);

  // 搜索股票/基金
  const handleSearch = async () => {
    if (!code) return;

    setSearching(true);
    setError('');

    try {
      if (type === 'stock') {
        const quote = await fetchStockQuote(code);
        if (quote) {
          setName(quote.name);
          if (!buyPrice) setBuyPrice(quote.price.toString());
        } else {
          setError('未找到该股票');
        }
      } else {
        const navData = await fetchFundNav(code);
        if (navData) {
          setName(navData.name);
          if (!buyNav) setBuyNav(navData.nav.toString());
        } else {
          setError('未找到该基金');
        }
      }
    } catch (e) {
      setError('查询失败，请检查代码');
    }

    setSearching(false);
  };

  // 保存
  const handleSave = () => {
    if (!code || !name || !accountId) {
      setError('请填写完整信息');
      return;
    }

    if (type === 'stock') {
      if (!buyPrice || !quantity) {
        setError('请填写买入价和数量/金额');
        return;
      }
      const position: StockPosition = {
        id: (editData as StockPosition)?.id || '',
        accountId,
        stockCode: code,
        stockName: name,
        buyPrice: parseFloat(buyPrice),
        buyDate,
        quantity: parseInt(quantity),
        fee: parseFloat(fee) || 0,
      };
      onSave(position, 'stock');
    } else {
      if (!buyNav || !shares) {
        setError('请填写买入净值和份额/金额');
        return;
      }
      const position: FundPosition = {
        id: (editData as FundPosition)?.id || '',
        accountId,
        fundCode: code,
        fundName: name,
        buyNav: parseFloat(buyNav),
        buyDate,
        amount: parseFloat(fundAmount) || parseFloat(shares) * parseFloat(buyNav),
        shares: parseFloat(shares),
      };
      onSave(position, 'fund');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editData ? '编辑' : '添加'}{type === 'stock' ? '股票' : '基金'}持仓
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 代码搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === 'stock' ? '股票代码' : '基金代码'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={type === 'stock' ? '如 600000' : '如 000001'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {name && <p className="mt-1 text-sm text-green-600">{name}</p>}
          </div>

          {/* 账户选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账户</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* 买入日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">买入日期</label>
            <input
              type="date"
              value={buyDate}
              onChange={e => setBuyDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* 股票表单 */}
          {type === 'stock' && (
            <>
              {/* 输入方式切换 */}
              <div className="flex border border-gray-300 rounded-md p-1">
                <button
                  onClick={() => setInputMode('quantity')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${inputMode === 'quantity' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                >
                  按股数
                </button>
                <button
                  onClick={() => setInputMode('amount')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${inputMode === 'amount' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                >
                  按金额
                </button>
              </div>

              {/* 买入价 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">买入价</label>
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 股数/金额 */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    数量（股）{inputMode === 'amount' && <span className="text-gray-400">自动计算</span>}
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => { setQuantity(e.target.value); setInputMode('quantity'); }}
                    placeholder="100"
                    disabled={inputMode === 'amount'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${inputMode === 'amount' ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    总金额{inputMode === 'quantity' && <span className="text-gray-400">自动计算</span>}
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={e => { setTotalAmount(e.target.value); setInputMode('amount'); }}
                    placeholder="0.00"
                    disabled={inputMode === 'quantity'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${inputMode === 'quantity' ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>

              {/* 手续费 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手续费</label>
                <input
                  type="number"
                  value={fee}
                  onChange={e => setFee(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          {/* 基金表单 */}
          {type === 'fund' && (
            <>
              {/* 输入方式切换 */}
              <div className="flex border border-gray-300 rounded-md p-1">
                <button
                  onClick={() => setFundInputMode('amount')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${fundInputMode === 'amount' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                >
                  按金额
                </button>
                <button
                  onClick={() => setFundInputMode('shares')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${fundInputMode === 'shares' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                >
                  按份额
                </button>
              </div>

              {/* 买入净值 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">买入净值</label>
                <input
                  type="number"
                  step="0.0001"
                  value={buyNav}
                  onChange={e => setBuyNav(e.target.value)}
                  placeholder="1.0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* 金额/份额 */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    买入金额{fundInputMode === 'shares' && <span className="text-gray-400">自动计算</span>}
                  </label>
                  <input
                    type="number"
                    value={fundAmount}
                    onChange={e => { setFundAmount(e.target.value); setFundInputMode('amount'); }}
                    placeholder="10000"
                    disabled={fundInputMode === 'shares'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${fundInputMode === 'shares' ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    份额{fundInputMode === 'amount' && <span className="text-gray-400">自动计算</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shares}
                    onChange={e => { setShares(e.target.value); setFundInputMode('shares'); }}
                    placeholder="自动计算"
                    disabled={fundInputMode === 'amount'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${fundInputMode === 'amount' ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900">
            取消
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}