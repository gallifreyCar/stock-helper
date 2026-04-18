// 数据存储 hook - 支持离线模式和云端同步

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { StorageData } from '../types';
import {
  defaultStorageData,
  type Account,
  type StockTransaction,
  type FundTransaction,
  type PriceAlert,
  type Settings,
  type AIConfig,
} from '../types/portfolio';

const STORAGE_KEY = 'stock-helper-data';
const ID_MAPPING_KEY = 'stock-helper-id-mapping';

// ID 映射：本地 ID -> 云端 UUID
interface IdMapping {
  accounts: Record<string, string>;
  stockTransactions: Record<string, string>;
  fundTransactions: Record<string, string>;
  alerts: Record<string, string>;
}

function getEmptyMapping(): IdMapping {
  return { accounts: {}, stockTransactions: {}, fundTransactions: {}, alerts: {} };
}

// 数据迁移：兼容旧格式
function migrateData(savedData: any): StorageData {
  if (savedData.stockTransactions && savedData.fundTransactions) {
    return savedData as StorageData;
  }

  if (savedData.stockPositions || savedData.fundPositions) {
    return {
      accounts: savedData.accounts || defaultStorageData.accounts,
      stockTransactions: [],
      fundTransactions: [],
      alerts: savedData.alerts || [],
      settings: {
        ...defaultStorageData.settings,
        ...(savedData.settings || {}),
      },
    };
  }

  return defaultStorageData;
}

// 从云端数据转换为本地格式
function dbToAccount(db: any): Account {
  return {
    id: db.id,
    name: db.name,
    type: db.type,
    createdAt: db.created_at,
  };
}

function dbToStockTx(db: any): StockTransaction {
  return {
    id: db.id,
    accountId: db.account_id,
    stockCode: db.stock_code,
    stockName: db.stock_name,
    type: db.type,
    date: db.date,
    price: Number(db.price),
    quantity: db.quantity,
    fee: Number(db.fee || 0),
    amount: Number(db.amount),
  };
}

function dbToFundTx(db: any): FundTransaction {
  return {
    id: db.id,
    accountId: db.account_id,
    fundCode: db.fund_code,
    fundName: db.fund_name,
    type: db.type,
    date: db.date,
    nav: Number(db.nav),
    shares: Number(db.shares),
    amount: Number(db.amount),
    fee: Number(db.fee || 0),
  };
}

function dbToAlert(db: any): PriceAlert {
  return {
    id: db.id,
    type: db.type,
    code: db.code,
    name: db.name,
    alertType: db.alert_type,
    targetPrice: Number(db.target_price),
    lossPrice: db.loss_price ? Number(db.loss_price) : undefined,
    enabled: db.enabled ?? true,
    triggered: db.triggered ?? false,
    createdAt: db.created_at,
  };
}

function dbToSettings(db: any): Settings {
  return {
    refreshInterval: db.refresh_interval ?? 30,
    showNotification: db.show_notification ?? true,
    aiConfig: db.ai_provider ? {
      provider: db.ai_provider as AIConfig['provider'],
      apiKey: db.ai_api_key || '',
      baseUrl: db.ai_base_url || undefined,
      model: db.ai_model || undefined,
    } : undefined,
  };
}

export function useStorage() {
  const { user, authMode } = useAuth();
  const [data, setData] = useState<StorageData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return migrateData(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    return defaultStorageData;
  });
  const [idMapping, setIdMapping] = useState<IdMapping>(() => {
    try {
      const saved = localStorage.getItem(ID_MAPPING_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getEmptyMapping();
  });
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>(
    authMode === 'offline' ? 'offline' : 'synced'
  );

  // 从云端加载数据
  const loadFromCloud = useCallback(async (userId: string) => {
    if (!supabase) return;

    setLoading(true);
    try {
      const mapping = getEmptyMapping();

      // 加载账户
      const { data: accountsDb } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      const accounts = (accountsDb || []).map(db => {
        mapping.accounts[db.id] = db.id;
        return dbToAccount(db);
      });

      // 加载股票交易
      const { data: stockTxsDb } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('user_id', userId);

      const stockTransactions = (stockTxsDb || []).map(db => {
        mapping.stockTransactions[db.id] = db.id;
        return dbToStockTx(db);
      });

      // 加载基金交易
      const { data: fundTxsDb } = await supabase
        .from('fund_transactions')
        .select('*')
        .eq('user_id', userId);

      const fundTransactions = (fundTxsDb || []).map(db => {
        mapping.fundTransactions[db.id] = db.id;
        return dbToFundTx(db);
      });

      // 加载价格提醒
      const { data: alertsDb } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId);

      const alerts = (alertsDb || []).map(db => {
        mapping.alerts[db.id] = db.id;
        return dbToAlert(db);
      });

      // 加载用户设置
      const { data: settingsDb } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const settings = settingsDb ? dbToSettings(settingsDb) : defaultStorageData.settings;

      setData({ accounts, stockTransactions, fundTransactions, alerts, settings });
      setIdMapping(mapping);
      localStorage.setItem(ID_MAPPING_KEY, JSON.stringify(mapping));
      setSyncStatus('synced');
    } catch (e) {
      console.error('Failed to load from cloud:', e);
      setSyncStatus('offline');
    }
    setLoading(false);
  }, []);

  // 登录后从云端加载
  useEffect(() => {
    if (authMode === 'online' && user?.id) {
      loadFromCloud(user.id);
    }
  }, [authMode, user?.id, loadFromCloud]);

  // 自动保存到 localStorage（离线备份）
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // 同步单个账户到云端
  const syncAccountToCloud = useCallback(async (account: Account, userId: string) => {
    if (!supabase || authMode === 'offline') return account.id;

    const existingId = idMapping.accounts[account.id];

    if (existingId) {
      await supabase
        .from('accounts')
        .update({ name: account.name, type: account.type })
        .eq('id', existingId);
      return existingId;
    } else {
      const { data: inserted, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: account.name,
          type: account.type,
        })
        .select()
        .single();

      if (inserted) {
        const newMapping = { ...idMapping, accounts: { ...idMapping.accounts, [account.id]: inserted.id } };
        setIdMapping(newMapping);
        localStorage.setItem(ID_MAPPING_KEY, JSON.stringify(newMapping));
        return inserted.id;
      }
      if (error) console.error('Insert account error:', error);
      return account.id;
    }
  }, [authMode, idMapping]);

  // 同步单个股票交易到云端
  const syncStockTxToCloud = useCallback(async (tx: StockTransaction, userId: string, accountId?: string) => {
    if (!supabase || authMode === 'offline') return tx.id;

    const cloudAccountId = accountId || idMapping.accounts[tx.accountId] || tx.accountId;
    const existingId = idMapping.stockTransactions[tx.id];

    if (existingId) {
      await supabase
        .from('stock_transactions')
        .update({
          stock_code: tx.stockCode,
          stock_name: tx.stockName,
          type: tx.type,
          date: tx.date,
          price: tx.price,
          quantity: tx.quantity,
          fee: tx.fee,
          amount: tx.amount,
        })
        .eq('id', existingId);
      return existingId;
    } else {
      const { data: inserted, error } = await supabase
        .from('stock_transactions')
        .insert({
          user_id: userId,
          account_id: cloudAccountId,
          stock_code: tx.stockCode,
          stock_name: tx.stockName,
          type: tx.type,
          date: tx.date,
          price: tx.price,
          quantity: tx.quantity,
          fee: tx.fee,
          amount: tx.amount,
        })
        .select()
        .single();

      if (inserted) {
        const newMapping = { ...idMapping, stockTransactions: { ...idMapping.stockTransactions, [tx.id]: inserted.id } };
        setIdMapping(newMapping);
        localStorage.setItem(ID_MAPPING_KEY, JSON.stringify(newMapping));
        return inserted.id;
      }
      if (error) console.error('Insert stock tx error:', error);
      return tx.id;
    }
  }, [authMode, idMapping]);

  // 同步单个基金交易到云端
  const syncFundTxToCloud = useCallback(async (tx: FundTransaction, userId: string, accountId?: string) => {
    if (!supabase || authMode === 'offline') return tx.id;

    const cloudAccountId = accountId || idMapping.accounts[tx.accountId] || tx.accountId;
    const existingId = idMapping.fundTransactions[tx.id];

    if (existingId) {
      await supabase
        .from('fund_transactions')
        .update({
          fund_code: tx.fundCode,
          fund_name: tx.fundName,
          type: tx.type,
          date: tx.date,
          nav: tx.nav,
          shares: tx.shares,
          amount: tx.amount,
          fee: tx.fee,
        })
        .eq('id', existingId);
      return existingId;
    } else {
      const { data: inserted, error } = await supabase
        .from('fund_transactions')
        .insert({
          user_id: userId,
          account_id: cloudAccountId,
          fund_code: tx.fundCode,
          fund_name: tx.fundName,
          type: tx.type,
          date: tx.date,
          nav: tx.nav,
          shares: tx.shares,
          amount: tx.amount,
          fee: tx.fee,
        })
        .select()
        .single();

      if (inserted) {
        const newMapping = { ...idMapping, fundTransactions: { ...idMapping.fundTransactions, [tx.id]: inserted.id } };
        setIdMapping(newMapping);
        localStorage.setItem(ID_MAPPING_KEY, JSON.stringify(newMapping));
        return inserted.id;
      }
      if (error) console.error('Insert fund tx error:', error);
      return tx.id;
    }
  }, [authMode, idMapping]);

  // 同步单个价格提醒到云端
  const syncAlertToCloud = useCallback(async (alert: PriceAlert, userId: string) => {
    if (!supabase || authMode === 'offline') return alert.id;

    const existingId = idMapping.alerts[alert.id];

    if (existingId) {
      await supabase
        .from('price_alerts')
        .update({
          type: alert.type,
          code: alert.code,
          name: alert.name,
          alert_type: alert.alertType,
          target_price: alert.targetPrice,
          loss_price: alert.lossPrice,
          enabled: alert.enabled,
          triggered: alert.triggered,
        })
        .eq('id', existingId);
      return existingId;
    } else {
      const { data: inserted, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: userId,
          type: alert.type,
          code: alert.code,
          name: alert.name,
          alert_type: alert.alertType,
          target_price: alert.targetPrice,
          loss_price: alert.lossPrice,
          enabled: alert.enabled,
        })
        .select()
        .single();

      if (inserted) {
        const newMapping = { ...idMapping, alerts: { ...idMapping.alerts, [alert.id]: inserted.id } };
        setIdMapping(newMapping);
        localStorage.setItem(ID_MAPPING_KEY, JSON.stringify(newMapping));
        return inserted.id;
      }
      if (error) console.error('Insert alert error:', error);
      return alert.id;
    }
  }, [authMode, idMapping]);

  // 同步设置到云端
  const syncSettingsToCloud = useCallback(async (settings: Settings, userId: string) => {
    if (!supabase || authMode === 'offline') return;

    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        refresh_interval: settings.refreshInterval,
        show_notification: settings.showNotification,
        ai_provider: settings.aiConfig?.provider,
        ai_api_key: settings.aiConfig?.apiKey,
        ai_base_url: settings.aiConfig?.baseUrl,
        ai_model: settings.aiConfig?.model,
        updated_at: new Date().toISOString(),
      });
  }, [authMode]);

  // 更新数据并同步
  const updateData = useCallback(async (partial: Partial<StorageData>) => {
    const newData = { ...data, ...partial };
    setData(newData);
    setSyncStatus('pending');

    if (authMode === 'online' && user?.id && supabase) {
      try {
        // 先同步账户，获取新的 ID 映射
        if (partial.accounts) {
          for (const account of partial.accounts) {
            await syncAccountToCloud(account, user.id);
          }
        }

        // 同步股票交易（使用最新的映射）
        if (partial.stockTransactions) {
          for (const tx of partial.stockTransactions) {
            await syncStockTxToCloud(tx, user.id);
          }
        }

        // 同步基金交易
        if (partial.fundTransactions) {
          for (const tx of partial.fundTransactions) {
            await syncFundTxToCloud(tx, user.id);
          }
        }

        // 同步提醒
        if (partial.alerts) {
          for (const alert of partial.alerts) {
            await syncAlertToCloud(alert, user.id);
          }
        }

        // 同步设置
        if (partial.settings) {
          await syncSettingsToCloud(partial.settings, user.id);
        }

        setSyncStatus('synced');
      } catch (e) {
        console.error('Sync failed:', e);
        setSyncStatus('pending');
      }
    }
  }, [data, authMode, user?.id, syncAccountToCloud, syncStockTxToCloud, syncFundTxToCloud, syncAlertToCloud, syncSettingsToCloud]);

  // 删除账户及关联数据
  const deleteAccount = useCallback(async (accountId: string) => {
    if (!supabase || authMode === 'offline') {
      const newData = {
        accounts: data.accounts.filter(a => a.id !== accountId),
        stockTransactions: data.stockTransactions.filter(t => t.accountId !== accountId),
        fundTransactions: data.fundTransactions.filter(t => t.accountId !== accountId),
      };
      setData({ ...data, ...newData });
      return;
    }

    const cloudId = idMapping.accounts[accountId];
    if (cloudId) {
      await supabase.from('accounts').delete().eq('id', cloudId);
    }

    const newData = {
      accounts: data.accounts.filter(a => a.id !== accountId),
      stockTransactions: data.stockTransactions.filter(t => t.accountId !== accountId),
      fundTransactions: data.fundTransactions.filter(t => t.accountId !== accountId),
    };
    setData({ ...data, ...newData });
  }, [data, authMode, idMapping]);

  // 删除交易记录
  const deleteStockTx = useCallback(async (txId: string) => {
    if (!supabase || authMode === 'offline') {
      setData({ ...data, stockTransactions: data.stockTransactions.filter(t => t.id !== txId) });
      return;
    }

    const cloudId = idMapping.stockTransactions[txId];
    if (cloudId) {
      await supabase.from('stock_transactions').delete().eq('id', cloudId);
    }
    setData({ ...data, stockTransactions: data.stockTransactions.filter(t => t.id !== txId) });
  }, [data, authMode, idMapping]);

  const deleteFundTx = useCallback(async (txId: string) => {
    if (!supabase || authMode === 'offline') {
      setData({ ...data, fundTransactions: data.fundTransactions.filter(t => t.id !== txId) });
      return;
    }

    const cloudId = idMapping.fundTransactions[txId];
    if (cloudId) {
      await supabase.from('fund_transactions').delete().eq('id', cloudId);
    }
    setData({ ...data, fundTransactions: data.fundTransactions.filter(t => t.id !== txId) });
  }, [data, authMode, idMapping]);

  // 删除价格提醒
  const deleteAlert = useCallback(async (alertId: string) => {
    if (!supabase || authMode === 'offline') {
      setData({ ...data, alerts: data.alerts.filter(a => a.id !== alertId) });
      return;
    }

    const cloudId = idMapping.alerts[alertId];
    if (cloudId) {
      await supabase.from('price_alerts').delete().eq('id', cloudId);
    }
    setData({ ...data, alerts: data.alerts.filter(a => a.id !== alertId) });
  }, [data, authMode, idMapping]);

  // 导出数据
  const exportData = useCallback(() => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-helper-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // 导入数据
  const importData = useCallback(async (json: string): Promise<boolean> => {
    try {
      const imported = JSON.parse(json);
      const migrated = migrateData(imported);
      setData(migrated);

      if (authMode === 'online' && user?.id && supabase) {
        setSyncStatus('pending');
        for (const account of migrated.accounts) {
          await syncAccountToCloud(account, user.id);
        }
        for (const tx of migrated.stockTransactions) {
          await syncStockTxToCloud(tx, user.id);
        }
        for (const tx of migrated.fundTransactions) {
          await syncFundTxToCloud(tx, user.id);
        }
        for (const alert of migrated.alerts) {
          await syncAlertToCloud(alert, user.id);
        }
        await syncSettingsToCloud(migrated.settings, user.id);
        setSyncStatus('synced');
      }
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }, [authMode, user?.id, syncAccountToCloud, syncStockTxToCloud, syncFundTxToCloud, syncAlertToCloud, syncSettingsToCloud]);

  // 清空数据
  const clearData = useCallback(async () => {
    setData(defaultStorageData);
    setIdMapping(getEmptyMapping());

    if (authMode === 'online' && user?.id && supabase) {
      await supabase.from('accounts').delete().eq('user_id', user.id);
      await supabase.from('stock_transactions').delete().eq('user_id', user.id);
      await supabase.from('fund_transactions').delete().eq('user_id', user.id);
      await supabase.from('price_alerts').delete().eq('user_id', user.id);
      await supabase.from('user_settings').delete().eq('user_id', user.id);
    }
  }, [authMode, user?.id]);

  // 手动同步
  const sync = useCallback(async () => {
    if (authMode === 'online' && user?.id) {
      await loadFromCloud(user.id);
    }
  }, [authMode, user?.id, loadFromCloud]);

  return {
    data,
    setData,
    updateData,
    exportData,
    importData,
    clearData,
    deleteAccount,
    deleteStockTx,
    deleteFundTx,
    deleteAlert,
    loading,
    syncStatus,
    sync,
  };
}