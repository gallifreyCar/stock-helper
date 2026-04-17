// 添加/编辑持仓弹窗

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
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
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('');
  const [fee, setFee] = useState('0');
  const [buyNav, setBuyNav] = useState('');
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

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
        setFee(editData.fee.toString());
      } else if (type === 'fund' && 'fundCode' in editData) {
        setCode(editData.fundCode);
        setName(editData.fundName);
        setBuyNav(editData.buyNav.toString());
        setAmount(editData.amount.toString());
        setShares(editData.shares.toString());
      }
    }
  }, [editData, type]);

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

  // 计算基金份额
  const calculateShares = () => {
    if (buyNav && amount) {
      const sharesNum = parseFloat(amount) / parseFloat(buyNav);
      setShares(sharesNum.toFixed(2));
    }
  };

  // 保存
  const handleSave = () => {
    if (!code || !name || !accountId) {
      setError('请填写完整信息');
      return;
    }

    if (type === 'stock') {
      if (!buyPrice || !quantity) {
        setError('请填写买入价和数量');
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
      if (!buyNav || !amount) {
        setError('请填写买入净值和金额');
        return;
      }
      const position: FundPosition = {
        id: (editData as FundPosition)?.id || '',
        accountId,
        fundCode: code,
        fundName: name,
        buyNav: parseFloat(buyNav),
        buyDate,
        amount: parseFloat(amount),
        shares: parseFloat(shares) || parseFloat(amount) / parseFloat(buyNav),
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">买入价</label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={e => setBuyPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量（股）</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">买入金额</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => {
                      setAmount(e.target.value);
                      calculateShares();
                    }}
                    placeholder="10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">份额</label>
                <input
                  type="number"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  placeholder="自动计算"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
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