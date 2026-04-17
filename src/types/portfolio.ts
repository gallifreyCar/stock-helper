// 持仓类型定义

import type { StockQuote } from './stock';
import type { FundQuote } from './fund';

// 账户分组类型
export type AccountType = 'long-term' | 'short-term' | 'fund';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  createdAt: string;
}

// 股票持仓
export interface StockPosition {
  id: string;
  accountId: string;
  stockCode: string;      // 原始代码如 600000
  stockName: string;
  buyPrice: number;       // 买入价格
  buyDate: string;        // 买入日期
  quantity: number;       // 持股数量（股）
  fee: number;            // 手续费
}

// 基金持仓
export interface FundPosition {
  id: string;
  accountId: string;
  fundCode: string;
  fundName: string;
  buyNav: number;         // 买入净值
  buyDate: string;
  amount: number;         // 持有金额（元）
  shares: number;         // 持有份额
}

// 持仓计算结果
export interface StockPositionValue extends StockPosition {
  currentPrice: number;
  currentQuote: StockQuote;
  marketValue: number;    // 当前市值
  costValue: number;      // 成本市值
  profit: number;         // 盈亏金额
  profitPercent: number;  // 盈亏比例
  costPrice: number;      // 成本价（含手续费）
}

export interface FundPositionValue extends FundPosition {
  currentNav: number;
  currentQuote: FundQuote;
  marketValue: number;
  profit: number;
  profitPercent: number;
}

// 全局数据存储结构
export interface StorageData {
  accounts: Account[];
  stockPositions: StockPosition[];
  fundPositions: FundPosition[];
  alerts: PriceAlert[];
  settings: Settings;
}

// 价格提醒
export interface PriceAlert {
  id: string;
  type: 'stock' | 'fund';
  code: string;
  name: string;
  alertType: 'profit' | 'loss' | 'both';
  targetPrice: number;    // 目标价格
  lossPrice?: number;     // 止损价
  enabled: boolean;
  triggered?: boolean;
  createdAt: string;
}

// 设置
export interface Settings {
  refreshInterval: number;  // 刷新间隔（秒）
  showNotification: boolean;
}

// 默认数据
export const defaultStorageData: StorageData = {
  accounts: [
    { id: '1', name: '长期持有', type: 'long-term', createdAt: new Date().toISOString() },
    { id: '2', name: '短线交易', type: 'short-term', createdAt: new Date().toISOString() },
    { id: '3', name: '基金定投', type: 'fund', createdAt: new Date().toISOString() },
  ],
  stockPositions: [],
  fundPositions: [],
  alerts: [],
  settings: {
    refreshInterval: 30,
    showNotification: true,
  },
};

// 生成唯一ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}