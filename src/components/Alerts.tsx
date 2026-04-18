// Alerts 价格提醒页面

import { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import type { PriceAlert } from '../types';
import { generateId } from '../types';

export function Alerts() {
  const { data, updateData } = useStorage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'stock' as 'stock' | 'fund',
    code: '',
    name: '',
    targetPrice: '',
    lossPrice: '',
    alertType: 'both' as 'profit' | 'loss' | 'both',
  });

  // 添加提醒
  const addAlert = () => {
    if (!newAlert.code || !newAlert.targetPrice) return;

    const alert: PriceAlert = {
      id: generateId(),
      type: newAlert.type,
      code: newAlert.code,
      name: newAlert.name || newAlert.code,
      alertType: newAlert.alertType,
      targetPrice: parseFloat(newAlert.targetPrice),
      lossPrice: newAlert.lossPrice ? parseFloat(newAlert.lossPrice) : undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    updateData({
      alerts: [...data.alerts, alert],
    });

    setShowAddModal(false);
    setNewAlert({
      type: 'stock',
      code: '',
      name: '',
      targetPrice: '',
      lossPrice: '',
      alertType: 'both',
    });
  };

  // 删除提醒
  const deleteAlert = (id: string) => {
    updateData({
      alerts: data.alerts.filter(a => a.id !== id),
    });
  };

  // 切换提醒状态
  const toggleAlert = (id: string) => {
    updateData({
      alerts: data.alerts.map(a =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    });
  };

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateData({
          settings: { ...data.settings, showNotification: true },
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 通知权限提示 */}
      {!data.settings.showNotification && 'Notification' in window && Notification.permission !== 'granted' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <div className="flex-1">
            <p className="text-yellow-800">需要开启浏览器通知才能接收价格提醒</p>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm"
          >
            开启通知
          </button>
        </div>
      )}

      {/* 添加提醒按钮 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          添加提醒
        </button>
      </div>

      {/* 提醒列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            价格提醒 ({data.alerts.length})
          </h2>
        </div>

        {data.alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无价格提醒
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 flex items-center justify-between ${!alert.enabled ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${alert.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-medium text-gray-900">{alert.name || alert.code}</p>
                    <p className="text-sm text-gray-500">
                      {alert.type === 'stock' ? '股票' : '基金'} · {alert.code}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm">
                    {alert.alertType === 'profit' && `止盈: ${alert.targetPrice}`}
                    {alert.alertType === 'loss' && `止损: ${alert.targetPrice}`}
                    {alert.alertType === 'both' && `止盈: ${alert.targetPrice} | 止损: ${alert.lossPrice}`}
                  </p>
                  {alert.triggered && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      已触发
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleAlert(alert.id)}
                    className={`px-3 py-1 rounded-md text-sm ${alert.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {alert.enabled ? '已启用' : '已禁用'}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加提醒弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">添加价格提醒</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={newAlert.type}
                  onChange={e => setNewAlert({ ...newAlert, type: e.target.value as 'stock' | 'fund' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="stock">股票</option>
                  <option value="fund">基金</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
                <input
                  type="text"
                  value={newAlert.code}
                  onChange={e => setNewAlert({ ...newAlert, code: e.target.value })}
                  placeholder={newAlert.type === 'stock' ? '如 600000' : '如 000001'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称（可选）</label>
                <input
                  type="text"
                  value={newAlert.name}
                  onChange={e => setNewAlert({ ...newAlert, name: e.target.value })}
                  placeholder="便于识别"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提醒类型</label>
                <select
                  value={newAlert.alertType}
                  onChange={e => setNewAlert({ ...newAlert, alertType: e.target.value as 'profit' | 'loss' | 'both' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="profit">仅止盈</option>
                  <option value="loss">仅止损</option>
                  <option value="both">止盈+止损</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newAlert.alertType === 'loss' ? '止损价' : '止盈价'}
                  </label>
                  <input
                    type="number"
                    value={newAlert.targetPrice}
                    onChange={e => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                {newAlert.alertType === 'both' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">止损价</label>
                    <input
                      type="number"
                      value={newAlert.lossPrice}
                      onChange={e => setNewAlert({ ...newAlert, lossPrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={addAlert}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        价格提醒在打开页面时检查。如需实时提醒，请保持页面打开。
      </p>
    </div>
  );
}