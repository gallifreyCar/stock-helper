// Supabase 配置页面 - 用户输入自己的 Supabase URL 和 key

import { useState } from 'react';
import { Database, Check, X, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import {
  saveSupabaseConfig,
  clearSupabaseConfig,
  getSupabaseUrl,
} from '../../lib/supabase';

interface SupabaseConfigProps {
  onSkip: () => void;
}

export function SupabaseConfig({ onSkip }: SupabaseConfigProps) {
  const currentUrl = getSupabaseUrl();
  const [url, setUrl] = useState(currentUrl || '');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleConfigure = async () => {
    if (!url || !key) {
      setError('请填写 URL 和 API Key');
      setSuccess(null);
      return;
    }

    // 验证 URL 格式
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      setError('URL 格式不正确，应为 https://xxx.supabase.co');
      setSuccess(null);
      return;
    }

    // 验证 key 格式（anon key 是 JWT 格式）
    if (!key.startsWith('eyJ')) {
      setError('API Key 格式不正确，anon key 应以 eyJ 开头');
      setSuccess(null);
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    // 测试连接 - 尝试访问 accounts 表
    try {
      const response = await fetch(`${url}/rest/v1/accounts?limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });

      if (response.ok) {
        // 连接成功，保存配置
        saveSupabaseConfig(url, key);
        setSuccess('✅ 连接成功！正在跳转...');
        // 刷新页面重新初始化 Supabase 客户端
        setTimeout(() => {
          window.location.href = window.location.pathname + '#/login';
        }, 500);
      } else if (response.status === 401) {
        // 401 说明 key 无效
        setError('API Key 无效，请检查是否为正确的 anon key');
      } else if (response.status === 404) {
        // 404 说明表不存在，但连接成功
        setError('连接成功，但数据库表未创建。请在 Supabase 中运行迁移创建表。');
        // 还是保存配置，让用户继续
        saveSupabaseConfig(url, key);
        setSuccess('配置已保存，正在跳转...');
        setTimeout(() => {
          window.location.href = window.location.pathname + '#/login';
        }, 1500);
      } else {
        setError(`连接失败: HTTP ${response.status}`);
      }
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        setError('网络错误，无法连接到 Supabase。请检查 URL 是否正确。');
      } else {
        setError(e instanceof Error ? e.message : '配置失败，请检查网络');
      }
    }

    setTesting(false);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Database className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">配置云端数据库</h1>
          <p className="text-gray-600 text-sm mt-2">
            使用你自己的 Supabase 项目，数据完全私有
          </p>
        </div>

        {currentUrl && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">当前配置: {currentUrl}</span>
              </div>
              <button
                onClick={handleClear}
                className="text-sm text-red-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                重新配置
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supabase URL
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              anon public key (以 eyJ 开头)
            </label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          <button
            onClick={handleConfigure}
            disabled={testing}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                测试连接中...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                测试连接并保存
              </>
            )}
          </button>

          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-gray-500 hover:text-blue-600 text-sm"
            >
              跳过，使用离线模式
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            还没有 Supabase 项目？
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1"
            >
              免费创建
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p className="text-xs text-gray-400 text-center mt-2">
            创建后，在 Settings → API 获取 URL 和 anon key
          </p>
        </div>
      </div>
    </div>
  );
}