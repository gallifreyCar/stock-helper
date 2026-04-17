// 收益计算工具

import { StockPosition, FundPosition, StockQuote, FundQuote } from '../types';

// 计算股票持仓价值
export function calculateStockPositionValue(
  position: StockPosition,
  quote: StockQuote
): {
  marketValue: number;
  costValue: number;
  profit: number;
  profitPercent: number;
  costPrice: number;
} {
  const costPrice = (position.buyPrice * position.quantity + position.fee) / position.quantity;
  const costValue = costPrice * position.quantity;
  const marketValue = quote.price * position.quantity;
  const profit = marketValue - costValue;
  const profitPercent = costValue > 0 ? (profit / costValue) * 100 : 0;

  return {
    marketValue,
    costValue,
    profit,
    profitPercent,
    costPrice,
  };
}

// 计算基金持仓价值
export function calculateFundPositionValue(
  position: FundPosition,
  nav: number
): {
  marketValue: number;
  profit: number;
  profitPercent: number;
} {
  const marketValue = position.shares * nav;
  const costValue = position.amount;
  const profit = marketValue - costValue;
  const profitPercent = costValue > 0 ? (profit / costValue) * 100 : 0;

  return {
    marketValue,
    profit,
    profitPercent,
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