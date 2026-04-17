// Settings 设置页面

import { useRef } from 'react';
import { Download, Upload, Trash2, Database } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';

export function Settings() {
  const { data, exportData, importData, clearData } = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const success = importData(json);
      if (success) {
        alert('导入成功！');
      } else {
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      clearData();
      alert('数据已清空');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          数据管理
        </h2>

        <div className="space-y-4">
          {/* 当前数据统计 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">当前数据统计</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.accounts.length}</p>
                <p className="text-xs text-gray-500">账户</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.stockTransactions.length}</p>
                <p className="text-xs text-gray-500">股票交易</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.fundTransactions.length}</p>
                <p className="text-xs text-gray-500">基金交易</p>
              </div>
            </div>
          </div>

          {/* 导出 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">导出数据</p>
              <p className="text-sm text-gray-500">导出JSON文件备份你的持仓数据</p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>

          {/* 导入 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">导入数据</p>
              <p className="text-sm text-gray-500">从JSON备份文件恢复数据</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
          </div>

          {/* 清空 */}
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <p className="font-medium text-red-900">清空数据</p>
              <p className="text-sm text-red-600">删除所有持仓和设置数据</p>
            </div>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">使用说明</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• 数据保存在浏览器本地存储，清除浏览器缓存会导致数据丢失</p>
          <p>• 建议定期导出数据备份</p>
          <p>• 股票行情来自新浪财经，基金净值来自天天基金</p>
          <p>• 本工具仅供参考，不构成投资建议</p>
        </div>
      </div>

      {/* 关于 */}
      <div className="text-center text-xs text-gray-400">
        <p>A股基金投资助手 v1.0</p>
        <p>数据仅供参考，投资需谨慎</p>
      </div>
    </div>
  );
}