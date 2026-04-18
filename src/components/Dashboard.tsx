// Dashboard 总览页面

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PiggyBank, History, CheckCircle } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { fetchStockQuotes, fetchFundNavs } from '../utils/api';
import { calculateStockPositionValue, calculateFundPositionValue, formatMoney, formatChange } from '../utils/calculator';
import { calculateStockPositions, calculateFundPositions } from '../types';
import type { StockQuote } from '../types';

export function Dashboard() {
  const { data } = useStorage();
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [fundNavs, setFundNavs] = useState<Map<string, { nav: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  // 计算持仓汇总
  const stockPositions = calculateStockPositions(data.stockTransactions);
  const fundPositions = calculateFundPositions(data.fundTransactions);

  // 已清仓记录（持仓为0但有已实现盈亏）
  const clearedStocks = stockPositions.filter(p => p.totalQuantity === 0 && p.realizedProfit !== 0);
  const clearedFunds = fundPositions.filter(p => p.totalShares === 0 && p.realizedProfit !== 0);

  // 判断是否在交易时间段内（周一至周五 9:30-11:30, 13:00-15:00）
  const isInTradingTime = () => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;  // 周末不交易

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours * 60 + minutes;

    // 9:30-11:30 = 570-690
    // 13:00-15:00 = 780-900
    return (time >= 570 && time <= 690) || (time >= 780 && time <= 900);
  };

  // 获取实时行情（只在交易时间段内自动刷新）
  useEffect(() => {
    async function fetchQuotes() {
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
    }

    fetchQuotes();

    // 只在交易时间内设置定时刷新
    if (isInTradingTime()) {
      const interval = setInterval(fetchQuotes, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // 计算总市值和总盈亏
  const totalStockValue = stockPositions.reduce((sum, pos) => {
    if (pos.totalQuantity <= 0) return sum;
    const quote = stockQuotes.get(pos.stockCode);
    if (quote) {
      return sum + calculateStockPositionValue(pos, quote.price).marketValue;
    }
    return sum;
  }, 0);

  const totalStockProfit = stockPositions.reduce((sum, pos) => {
    const quote = stockQuotes.get(pos.stockCode);
    if (quote && pos.totalQuantity > 0) {
      return sum + calculateStockPositionValue(pos, quote.price).totalProfit;
    }
    // 已清仓的也要计入已实现盈亏
    if (pos.totalQuantity === 0) {
      return sum + pos.realizedProfit;
    }
    return sum;
  }, 0);

  const totalFundValue = fundPositions.reduce((sum, pos) => {
    if (pos.totalShares <= 0) return sum;
    const navData = fundNavs.get(pos.fundCode);
    if (navData) {
      return sum + calculateFundPositionValue(pos, navData.nav).marketValue;
    }
    return sum + pos.totalCost;
  }, 0);

  const totalFundProfit = fundPositions.reduce((sum, pos) => {
    const navData = fundNavs.get(pos.fundCode);
    if (navData && pos.totalShares > 0) {
      return sum + calculateFundPositionValue(pos, navData.nav).totalProfit;
    }
    if (pos.totalShares === 0) {
      return sum + pos.realizedProfit;
    }
    return sum;
  }, 0);

  const totalValue = totalStockValue + totalFundValue;
  const totalProfit = totalStockProfit + totalFundProfit;
  const totalCost = stockPositions.reduce((s, p) => s + p.totalCost, 0) +
                    fundPositions.reduce((s, p) => s + p.totalCost, 0);
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  // 已实现盈亏（不含未实现）
  const realizedStockProfit = stockPositions.reduce((sum, pos) => sum + pos.realizedProfit, 0);
  const realizedFundProfit = fundPositions.reduce((sum, pos) => sum + pos.realizedProfit, 0);
  const totalRealizedProfit = realizedStockProfit + realizedFundProfit;

  // 当前持有数量
  const holdingStocks = stockPositions.filter(p => p.totalQuantity > 0);
  const holdingFunds = fundPositions.filter(p => p.totalShares > 0);

  if (holdingStocks.length === 0 && holdingFunds.length === 0 && clearedStocks.length === 0 && clearedFunds.length === 0) {
    return (
      <div className="text-center py-12">
        <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">暂无持仓数据</p>
        <a href="#/portfolio" className="text-blue-600 hover:underline">
          前去添加交易记录 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            {holdingStocks.length + holdingFunds.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            股票 {holdingStocks.length} · 基金 {holdingFunds.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
            <History className="w-4 h-4" />
            已实现盈亏
          </p>
          <p className={`text-2xl font-bold ${totalRealizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {totalRealizedProfit >= 0 ? '+' : ''}{formatMoney(totalRealizedProfit)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            已清仓 {clearedStocks.length + clearedFunds.length} 只
          </p>
        </div>
      </div>

      {/* 当前持仓概览 */}
      {(holdingStocks.length > 0 || holdingFunds.length > 0) && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">当前持仓</h2>
            <span className="text-sm text-gray-500">
              {holdingStocks.length + holdingFunds.length} 只
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* 股票持仓 */}
              {holdingStocks.map(pos => {
                const quote = stockQuotes.get(pos.stockCode);
                if (!quote) return null;

                const value = calculateStockPositionValue(pos, quote.price);

                return (
                  <div key={pos.stockCode} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{quote.name}</p>
                      <p className="text-sm text-gray-500">{pos.stockCode} · {pos.totalQuantity}股</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatMoney(value.marketValue)}</p>
                      <p className={`text-sm ${value.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatChange(value.unrealizedPercent)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 基金持仓 */}
              {holdingFunds.map(pos => {
                const navData = fundNavs.get(pos.fundCode);
                const nav = navData?.nav || pos.avgNav;
                const value = calculateFundPositionValue(pos, nav);

                return (
                  <div key={pos.fundCode} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {navData?.name || pos.fundName}
                      </p>
                      <p className="text-sm text-gray-500">{pos.fundCode} · {pos.totalShares.toFixed(2)}份</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatMoney(value.marketValue)}</p>
                      <p className={`text-sm ${value.totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatChange(value.unrealizedPercent)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 已清仓记录 */}
      {(clearedStocks.length > 0 || clearedFunds.length > 0) && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              已清仓记录
            </h2>
            <span className={`text-sm font-medium ${totalRealizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              已实现盈亏: {totalRealizedProfit >= 0 ? '+' : ''}{formatMoney(totalRealizedProfit)}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {clearedStocks.map(pos => {
                const buyCount = pos.transactions.filter(t => t.type === 'buy').length;
                const sellCount = pos.transactions.filter(t => t.type === 'sell').length;
                return (
                  <div key={`stock-${pos.stockCode}`} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{pos.stockName}</p>
                      <p className="text-sm text-gray-500">{pos.stockCode} · 已清仓</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${pos.realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                      </p>
                      <p className="text-xs text-gray-400">
                        买入{buyCount}次 / 卖出{sellCount}次
                      </p>
                    </div>
                  </div>
                );
              })}

              {clearedFunds.map(pos => {
                const buyCount = pos.transactions.filter(t => t.type === 'buy').length;
                const sellCount = pos.transactions.filter(t => t.type === 'sell').length;
                return (
                  <div key={`fund-${pos.fundCode}`} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{pos.fundName}</p>
                      <p className="text-sm text-gray-500">{pos.fundCode} · 已清仓</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${pos.realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {pos.realizedProfit >= 0 ? '+' : ''}{formatMoney(pos.realizedProfit)}
                      </p>
                      <p className="text-xs text-gray-400">
                        买入{buyCount}次 / 卖出{sellCount}次
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {holdingStocks.length === 0 && holdingFunds.length === 0 && (clearedStocks.length > 0 || clearedFunds.length > 0) && (
        <div className="text-center py-6">
          <p className="text-gray-500">
            当前无持仓，查看上方已清仓记录
          </p>
          <a href="#/portfolio" className="text-blue-600 hover:underline mt-2 inline-block">
            添加新交易 →
          </a>
        </div>
      )}
    </div>
  );
}