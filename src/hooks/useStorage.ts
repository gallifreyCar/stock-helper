// LocalStorage 存储 hook

import { useState, useEffect, useCallback } from 'react';
import { StorageData, defaultStorageData } from '../types';

const STORAGE_KEY = 'stock-helper-data';

export function useStorage() {
  const [data, setData] = useState<StorageData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as StorageData;
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
      const imported = JSON.parse(json) as StorageData;
      // 验证基本结构
      if (!imported.accounts || !imported.stockPositions || !imported.fundPositions) {
        throw new Error('Invalid data structure');
      }
      setData(imported);
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