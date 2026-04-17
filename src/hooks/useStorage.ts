// LocalStorage 存储 hook

import { useState, useEffect, useCallback } from 'react';
import type { StorageData } from '../types';
import { defaultStorageData } from '../types';

const STORAGE_KEY = 'stock-helper-data';

// 数据迁移：兼容旧格式
function migrateData(savedData: any): StorageData {
  // 如果是新格式，直接返回
  if (savedData.stockTransactions && savedData.fundTransactions) {
    return savedData as StorageData;
  }

  // 如果是旧格式（有 stockPositions/fundPositions），迁移到新格式
  if (savedData.stockPositions || savedData.fundPositions) {
    const migrated: StorageData = {
      accounts: savedData.accounts || defaultStorageData.accounts,
      stockTransactions: [],
      fundTransactions: [],
      alerts: savedData.alerts || [],
      settings: {
        ...defaultStorageData.settings,
        ...(savedData.settings || {}),
      },
    };

    // 旧持仓数据废弃，需要重新添加
    console.log('数据格式已更新，旧持仓数据需要重新添加');
    return migrated;
  }

  // 其他情况，使用默认数据
  return defaultStorageData;
}

export function useStorage() {
  const [data, setData] = useState<StorageData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return migrateData(parsed);
      }
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
    }
    return defaultStorageData;
  });

  // 自动保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data to localStorage:', e);
    }
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

  // 更新部分数据
  const updateData = useCallback((partial: Partial<StorageData>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  return {
    data,
    setData,
    updateData,
    exportData,
    importData,
    clearData,
  };
}