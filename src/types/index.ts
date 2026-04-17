export * from './stock';
export * from './fund';
export * from './portfolio';

// 兼容旧数据格式的类型（已废弃，保留用于数据迁移）
export interface StockPosition {
  id: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  buyPrice: number;
  buyDate: string;
  quantity: number;
  fee: number;
}

export interface FundPosition {
  id: string;
  accountId: string;
  fundCode: string;
  fundName: string;
  buyNav: number;
  buyDate: string;
  amount: number;
  shares: number;
}