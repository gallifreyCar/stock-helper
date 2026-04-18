// 数据存储 hook - 支持离线模式和云端同步

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { StorageData } from '../types';
import { defaultStorageData } from '../types';

const STORAGE_KEY = 'stock-helper-data';

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

export function useStorage() {
  const { authMode } = useAuth();
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
  const [loading] = useState(false);
  const [syncStatus] = useState<'synced' | 'pending' | 'offline'>(
    authMode === 'offline' ? 'offline' : 'synced'
  );

  // 自动保存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // 更新数据
  const updateData = useCallback((partial: Partial<StorageData>) => {
    const newData = { ...data, ...partial };
    setData(newData);
  }, [data]);

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
  const importData = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json);
      const migrated = migrateData(imported);
      setData(migrated);
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }, []);

  // 清空数据
  const clearData = useCallback(() => {
    setData(defaultStorageData);
  }, []);

  // 手动同步（暂不实现）
  const sync = useCallback(async () => {
    // TODO: 实现手动同步到 Supabase
  }, []);

  return {
    data,
    setData,
    updateData,
    exportData,
    importData,
    clearData,
    loading,
    syncStatus,
    sync,
  };
}