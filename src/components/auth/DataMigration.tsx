// 数据迁移组件 - 将 localStorage 数据迁移到 Supabase

import { useState } from 'react';
import { Upload, Cloud, Check, Loader2 } from 'lucide-react';
import type { StorageData } from '../../types';

interface DataMigrationProps {
  localData: StorageData;
  onMigrate: (data: StorageData) => Promise<void>;
  onSkip: () => void;
}

export function DataMigration({ localData, onMigrate, onSkip }: DataMigrationProps) {
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocalData = localData &&
    (localData.accounts.length > 0 ||
     localData.stockTransactions.length > 0 ||
     localData.fundTransactions.length > 0 ||
     localData.alerts.length > 0);

  if (!hasLocalData) {
    return null;
  }

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    try {
      await onMigrate(localData);
      setMigrated(true);
      // 清理 localStorage
      localStorage.removeItem('stock-helper-data');
    } catch (e) {
      setError((e as Error).message || '迁移失败，请重试');
    }
    setMigrating(false);
  };

  if (migrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">数据迁移成功！</h2>
          <p className="text-gray-600">您的本地数据已同步到云端</p>
          <button
            onClick={onSkip}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            开始使用
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    accounts: localData.accounts.length,
    stockTransactions: localData.stockTransactions.length,
    fundTransactions: localData.fundTransactions.length,
    alerts: localData.alerts.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          发现本地数据
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          您的浏览器中有以下本地数据，是否迁移到云端？
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white rounded p-3">
              <p className="text-lg font-bold text-gray-900">{counts.accounts}</p>
              <p className="text-xs text-gray-500">账户</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-lg font-bold text-gray-900">{counts.stockTransactions}</p>
              <p className="text-xs text-gray-500">股票交易</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-lg font-bold text-gray-900">{counts.fundTransactions}</p>
              <p className="text-xs text-gray-500">基金交易</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-lg font-bold text-gray-900">{counts.alerts}</p>
              <p className="text-xs text-gray-500">提醒</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {migrating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                迁移中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                迁移到云端
              </>
            )}
          </button>

          <button
            onClick={onSkip}
            disabled={migrating}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            暂不迁移
          </button>

          <p className="text-xs text-gray-400 text-center">
            迁移后本地数据将被清除，云端数据优先
          </p>
        </div>
      </div>
    </div>
  );
}