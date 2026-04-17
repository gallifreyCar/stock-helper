// 收益计算工具

import type { StockPositionSummary, FundPositionSummary } from '../types';

// 计算股票持仓市值和盈亏
export function calculateStockPositionValue(
  position: StockPositionSummary,
  currentPrice: number
): {
  marketValue: number;
  unrealizedProfit: number;
  unrealizedPercent: number;
  totalProfit: number;        // 已实现 + 未实现
} {
  const marketValue = currentPrice * position.totalQuantity;
  const unrealizedProfit = marketValue - position.totalCost;
  const unrealizedPercent = position.totalCost > 0
    ? (unrealizedProfit / position.totalCost) * 100
    : 0;
  const totalProfit = position.realizedProfit + unrealizedProfit;

  return {
    marketValue,
    unrealizedProfit,
    unrealizedPercent,
    totalProfit,
  };
}

// 计算基金持仓市值和盈亏
export function calculateFundPositionValue(
  position: FundPositionSummary,
  currentNav: number
): {
  marketValue: number;
  unrealizedProfit: number;
  unrealizedPercent: number;
  totalProfit: number;
} {
  const marketValue = currentNav * position.totalShares;
  const unrealizedProfit = marketValue - position.totalCost;
  const unrealizedPercent = position.totalCost > 0
    ? (unrealizedProfit / position.totalCost) * 100
    : 0;
  const totalProfit = position.realizedProfit + unrealizedProfit;

  return {
    marketValue,
    unrealizedProfit,
    unrealizedPercent,
    totalProfit,
  };
}

// 格式化金额
export function formatMoney(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`;
  }
  return value.toFixed(2);
}

// 格式化涨跌幅
export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// 格式化日期
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}