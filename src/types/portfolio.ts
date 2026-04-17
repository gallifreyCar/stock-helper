// 持仓类型定义

// 账户分组类型
export type AccountType = 'long-term' | 'short-term' | 'fund';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  createdAt: string;
}

// 股票交易记录（替代原来的持仓）
export interface StockTransaction {
  id: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  type: 'buy' | 'sell';       // 买入/卖出
  date: string;
  price: number;              // 成交价
  quantity: number;           // 数量（股）
  fee: number;                // 手续费
  amount: number;             // 成交金额（不含手续费）
}

// 基金交易记录
export interface FundTransaction {
  id: string;
  accountId: string;
  fundCode: string;
  fundName: string;
  type: 'buy' | 'sell';
  date: string;
  nav: number;                // 成交净值
  shares: number;             // 份额
  amount: number;             // 金额
}

// 计算后的持仓汇总
export interface StockPositionSummary {
  stockCode: string;
  stockName: string;
  accountId: string;
  totalQuantity: number;      // 当前持有数量
  avgPrice: number;           // 平均成本价
  totalCost: number;          // 总成本（含手续费）
  realizedProfit: number;     // 已实现盈亏
  transactions: StockTransaction[];
}

export interface FundPositionSummary {
  fundCode: string;
  fundName: string;
  accountId: string;
  totalShares: number;        // 当前持有份额
  avgNav: number;             // 平均成本净值
  totalCost: number;          // 总投入
  realizedProfit: number;     // 已实现盈亏
  transactions: FundTransaction[];
}

// 全局数据存储结构
export interface StorageData {
  accounts: Account[];
  stockTransactions: StockTransaction[];
  fundTransactions: FundTransaction[];
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
  aiConfig?: AIConfig;      // AI配置
}

// AI配置
export interface AIConfig {
  provider: 'deepseek' | 'openai' | 'claude' | 'custom';
  apiKey: string;
  baseUrl?: string;         // 自定义API地址
  model?: string;           // 模型名称
}

// AI提供商配置
export const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
    defaultModel: 'claude-3-haiku-20240307',
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    models: [],
    defaultModel: '',
  },
};

// 默认数据
export const defaultStorageData: StorageData = {
  accounts: [
    { id: '1', name: '长期持有', type: 'long-term', createdAt: new Date().toISOString() },
    { id: '2', name: '短线交易', type: 'short-term', createdAt: new Date().toISOString() },
    { id: '3', name: '基金定投', type: 'fund', createdAt: new Date().toISOString() },
  ],
  stockTransactions: [],
  fundTransactions: [],
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

// 计算股票持仓汇总
export function calculateStockPositions(transactions: StockTransaction[]): StockPositionSummary[] {
  const grouped = new Map<string, StockTransaction[]>();

  // 按股票代码分组
  for (const tx of transactions) {
    const key = `${tx.accountId}-${tx.stockCode}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tx);
  }

  const results: StockPositionSummary[] = [];

  for (const [_, txs] of grouped) {
    // 按日期排序
    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalQuantity = 0;
    let totalCost = 0;
    let realizedProfit = 0;

    for (const tx of sorted) {
      if (tx.type === 'buy') {
        totalQuantity += tx.quantity;
        totalCost += tx.amount + tx.fee;
      } else {
        // 卖出时计算盈亏
        const avgPriceBeforeSell = totalQuantity > 0 ? totalCost / totalQuantity : tx.price;
        const sellRevenue = tx.amount - tx.fee;
        const costOfSold = avgPriceBeforeSell * tx.quantity;

        realizedProfit += sellRevenue - costOfSold;
        totalQuantity -= tx.quantity;

        // 按比例减少成本
        if (totalQuantity > 0) {
          totalCost = totalCost * (totalQuantity / (totalQuantity + tx.quantity));
        } else {
          totalCost = 0;
        }
      }
    }

    // 只保留有持仓或有已实现盈亏的
    if (totalQuantity > 0 || realizedProfit !== 0) {
      const first = sorted[0];
      results.push({
        stockCode: first.stockCode,
        stockName: first.stockName,
        accountId: first.accountId,
        totalQuantity,
        avgPrice: totalQuantity > 0 ? totalCost / totalQuantity : 0,
        totalCost,
        realizedProfit,
        transactions: sorted,
      });
    }
  }

  return results;
}

// 计算基金持仓汇总
export function calculateFundPositions(transactions: FundTransaction[]): FundPositionSummary[] {
  const grouped = new Map<string, FundTransaction[]>();

  for (const tx of transactions) {
    const key = `${tx.accountId}-${tx.fundCode}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tx);
  }

  const results: FundPositionSummary[] = [];

  for (const [_, txs] of grouped) {
    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalShares = 0;
    let totalCost = 0;
    let realizedProfit = 0;

    for (const tx of sorted) {
      if (tx.type === 'buy') {
        totalShares += tx.shares;
        totalCost += tx.amount;
      } else {
        const avgNavBeforeSell = totalShares > 0 ? totalCost / totalShares : tx.nav;
        const sellRevenue = tx.amount;
        const costOfSold = avgNavBeforeSell * tx.shares;

        realizedProfit += sellRevenue - costOfSold;
        totalShares -= tx.shares;

        if (totalShares > 0) {
          totalCost = totalCost * (totalShares / (totalShares + tx.shares));
        } else {
          totalCost = 0;
        }
      }
    }

    if (totalShares > 0 || realizedProfit !== 0) {
      const first = sorted[0];
      results.push({
        fundCode: first.fundCode,
        fundName: first.fundName,
        accountId: first.accountId,
        totalShares,
        avgNav: totalShares > 0 ? totalCost / totalShares : 0,
        totalCost,
        realizedProfit,
        transactions: sorted,
      });
    }
  }

  return results;
}