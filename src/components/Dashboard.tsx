// Dashboard 总览页面

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { fetchStockQuotes, fetchFundNavs } from '../utils/api';
import { calculateStockPositionValue, calculateFundPositionValue, formatMoney, formatChange } from '../utils/calculator';
import type { StockQuote } from '../types';

export function Dashboard() {
  const { data } = useStorage();
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [fundNavs, setFundNavs] = useState<Map<string, { nav: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  // 获取实时行情
  useEffect(() => {
    async function fetchQuotes() {
      setLoading(true);

      // 获取所有股票代码
      const stockCodes = data.stockPositions.map(p => p.stockCode);
      if (stockCodes.length > 0) {
        const quotes = await fetchStockQuotes(stockCodes);
        const quoteMap = new Map(quotes.map(q => [q.code, q]));
        setStockQuotes(quoteMap);
      }

      // 获取所有基金代码
      const fundCodes = data.fundPositions.map(p => p.fundCode);
      if (fundCodes.length > 0) {
        const navMap = await fetchFundNavs(fundCodes);
        setFundNavs(navMap);
      }

      setLoading(false);
    }

    fetchQuotes();
  }, [data.stockPositions, data.fundPositions]);

  // 计算总市值和总盈亏
  const totalStockValue = data.stockPositions.reduce((sum, pos) => {
    const quote = stockQuotes.get(pos.stockCode);
    if (quote) {
      return sum + calculateStockPositionValue(pos, quote).marketValue;
    }
    return sum;
  }, 0);

  const totalStockProfit = data.stockPositions.reduce((sum, pos) => {
    const quote = stockQuotes.get(pos.stockCode);
    if (quote) {
      return sum + calculateStockPositionValue(pos, quote).profit;
    }
    return sum;
  }, 0);

  const totalFundValue = data.fundPositions.reduce((sum, pos) => {
    const navData = fundNavs.get(pos.fundCode);
    if (navData) {
      return sum + calculateFundPositionValue(pos, navData.nav).marketValue;
    }
    return sum + pos.amount;
  }, 0);

  const totalFundProfit = data.fundPositions.reduce((sum, pos) => {
    const navData = fundNavs.get(pos.fundCode);
    if (navData) {
      return sum + calculateFundPositionValue(pos, navData.nav).profit;
    }
    return 0;
  }, 0);

  const totalValue = totalStockValue + totalFundValue;
  const totalProfit = totalStockProfit + totalFundProfit;
  const profitPercent = (totalStockValue + totalFundValue - totalProfit) > 0
    ? (totalProfit / (totalValue - totalProfit)) * 100
    : 0;

  if (data.stockPositions.length === 0 && data.fundPositions.length === 0) {
    return (
      <div className="text-center py-12">
        <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">暂无持仓数据</p>
        <a href="/portfolio" className="text-blue-600 hover:underline">
          前去添加持仓 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-2">总市值</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : formatMoney(totalValue)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-2">总盈亏</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {loading ? '...' : (totalProfit >= 0 ? '+' : '') + formatMoney(totalProfit)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-2">收益率</p>
          <div className="flex items-center gap-2">
            {totalProfit >= 0 ? (
              <TrendingUp className="w-6 h-6 text-red-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-green-600" />
            )}
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '...' : formatChange(profitPercent)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-2">持仓数</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.stockPositions.length + data.fundPositions.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            股票 {data.stockPositions.length} · 基金 {data.fundPositions.length}
          </p>
        </div>
      </div>

      {/* 持仓概览 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">持仓概览</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* 股票持仓 */}
            {data.stockPositions.map(pos => {
              const quote = stockQuotes.get(pos.stockCode);
              if (!quote) return null;

              const value = calculateStockPositionValue(pos, quote);

              return (
                <div key={pos.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{quote.name}</p>
                    <p className="text-sm text-gray-500">{pos.stockCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatMoney(value.marketValue)}</p>
                    <p className={`text-sm ${value.profit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatChange(value.profitPercent)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* 基金持仓 */}
            {data.fundPositions.map(pos => {
              const navData = fundNavs.get(pos.fundCode);
              const nav = navData?.nav || pos.buyNav;
              const value = calculateFundPositionValue(pos, nav);

              return (
                <div key={pos.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {navData?.name || pos.fundName}
                    </p>
                    <p className="text-sm text-gray-500">{pos.fundCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatMoney(value.marketValue)}</p>
                    <p className={`text-sm ${value.profit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatChange(value.profitPercent)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}