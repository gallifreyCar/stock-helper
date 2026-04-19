// Settings 设置页面

import { useRef, useState } from 'react';
import { Download, Upload, Trash2, Database, Sparkles, Key, Check, Eye, EyeOff, RefreshCw, Newspaper } from 'lucide-react';
import { useStorage } from '../hooks/useStorage';
import { useAuth } from '../contexts/AuthContext';
import { AI_PROVIDERS, type AIConfig } from '../types';
import { getSupabaseUrl, clearSupabaseConfig } from '../lib/supabase';

export function Settings() {
  const { data, updateData, exportData, importData, clearData } = useStorage();
  const { authMode } = useAuth();
  const supabaseUrl = getSupabaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showKey, setShowKey] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(
    data.settings.aiConfig || { provider: 'deepseek', apiKey: '' }
  );
  const [tianApiKey, setTianApiKey] = useState<string>(data.settings.tianApiKey || '');
  const [rsshubUrl, setRsshubUrl] = useState<string>(data.settings.rsshubUrl || 'https://rrs-hub.vercel.app');
  const [corsProxyUrl, setCorsProxyUrl] = useState<string>(data.settings.corsProxyUrl || '');
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [tianTestResult, setTianTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [rsshubTestResult, setRsshubTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [corsTestResult, setCorsTestResult] = useState<'success' | 'error' | 'testing' | null>(null);

  // 保存AI配置
  const saveAiConfig = () => {
    updateData({
      settings: {
        ...data.settings,
        aiConfig,
      },
    });
    setTestResult(null);
  };

  // 保存TianAPI配置
  const saveTianApiKey = () => {
    updateData({
      settings: {
        ...data.settings,
        tianApiKey,
      },
    });
    setTianTestResult(null);
  };

  // 保存RSSHub配置
  const saveRsshubUrl = () => {
    updateData({
      settings: {
        ...data.settings,
        rsshubUrl,
      },
    });
    setRsshubTestResult(null);
  };

  // 保存CORS代理配置
  const saveCorsProxyUrl = () => {
    updateData({
      settings: {
        ...data.settings,
        corsProxyUrl,
      },
    });
    setCorsTestResult(null);
  };

  // 测试CORS代理配置
  const testCorsProxyUrl = async () => {
    if (!corsProxyUrl) {
      setCorsTestResult('error');
      return;
    }

    setCorsTestResult('testing');

    try {
      // 测试CORS代理调用东方财富API
      const testUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.600036&lmt=1';
      const response = await fetch(`${corsProxyUrl}?url=${encodeURIComponent(testUrl)}`);

      if (response.ok) {
        const text = await response.text();
        if (text.includes('klines')) {
          setCorsTestResult('success');
          saveCorsProxyUrl();
        } else {
          setCorsTestResult('error');
        }
      } else {
        setCorsTestResult('error');
      }
    } catch (e) {
      setCorsTestResult('error');
    }
  };

  // 测试RSSHub配置
  const testRsshubUrl = async () => {
    if (!rsshubUrl) {
      setRsshubTestResult('error');
      return;
    }

    setRsshubTestResult('testing');

    try {
      // 测试RSSHub调用（获取一条新闻）
      const response = await fetch(`${rsshubUrl}/eastmoney/search/600036`);

      if (response.ok) {
        const text = await response.text();
        // 检查是否包含有效的RSS内容
        if (text.includes('<item>')) {
          setRsshubTestResult('success');
          saveRsshubUrl();
        } else {
          setRsshubTestResult('error');
        }
      } else {
        setRsshubTestResult('error');
      }
    } catch (e) {
      setRsshubTestResult('error');
    }
  };

  // 测试TianAPI配置
  const testTianApiKey = async () => {
    if (!tianApiKey) {
      setTianTestResult('error');
      return;
    }

    setTianTestResult('testing');

    try {
      // 测试API调用（获取财经新闻）
      const response = await fetch(`https://apis.tianapi.com/caijing/index?key=${tianApiKey}&num=1`);

      const data = await response.json();

      if (data.code === 200) {
        setTianTestResult('success');
        saveTianApiKey();
      } else {
        setTianTestResult('error');
      }
    } catch (e) {
      setTianTestResult('error');
    }
  };

  // 测试AI配置
  const testAiConfig = async () => {
    if (!aiConfig.apiKey) {
      setTestResult('error');
      return;
    }

    setTestResult('testing');

    const provider = AI_PROVIDERS[aiConfig.provider];
    const baseUrl = aiConfig.baseUrl || provider.baseUrl;
    const model = aiConfig.model || provider.defaultModel;

    try {
      // 测试API调用
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '测试连接' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        setTestResult('success');
        saveAiConfig();
      } else {
        setTestResult('error');
      }
    } catch (e) {
      setTestResult('error');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const json = event.target?.result as string;
      const success = await importData(json);
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

  const currentProvider = AI_PROVIDERS[aiConfig.provider];

  return (
    <div className="space-y-6">
      {/* 云端数据库配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          云端数据库
        </h2>

        <div className="mb-4">
          {supabaseUrl ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">已配置</p>
                  <p className="text-xs text-blue-600">{supabaseUrl}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${authMode === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {authMode === 'online' ? '在线' : authMode === 'offline' ? '离线' : '未配置'}
                </span>
              </div>
              <button
                onClick={() => {
                  clearSupabaseConfig();
                  localStorage.removeItem('stock-helper-auth-mode');
                  // 刷新页面回到配置流程
                  window.location.reload();
                }}
                className="mt-3 text-sm text-red-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                重新配置数据库
              </button>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">未配置云端数据库，数据仅保存在本地</p>
              <button
                onClick={() => {
                  localStorage.removeItem('stock-helper-auth-mode');
                  // 刷新页面回到配置流程
                  window.location.reload();
                }}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                配置云端数据库
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI分析配置
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          配置你的API Key，在筛选器中可以实时获取AI分析。Key保存在浏览器本地，不会上传到服务器。
        </p>

        <div className="space-y-4">
          {/* 提供商选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI提供商</label>
            <select
              value={aiConfig.provider}
              onChange={e => {
                const provider = e.target.value as AIConfig['provider'];
                setAiConfig({
                  ...aiConfig,
                  provider,
                  baseUrl: AI_PROVIDERS[provider].baseUrl,
                  model: AI_PROVIDERS[provider].defaultModel,
                });
                setTestResult(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              {Object.entries(AI_PROVIDERS).map(([key, value]) => (
                <option key={key} value={key}>{value.name}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Key className="w-4 h-4" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={aiConfig.apiKey}
                onChange={e => {
                  setAiConfig({ ...aiConfig, apiKey: e.target.value });
                  setTestResult(null);
                }}
                placeholder={aiConfig.provider === 'deepseek' ? 'sk-...' : aiConfig.provider === 'openai' ? 'sk-...' : '输入API Key'}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {aiConfig.provider === 'deepseek' && '从 platform.deepseek.com 获取'}
              {aiConfig.provider === 'openai' && '从 platform.openai.com 获取'}
              {aiConfig.provider === 'claude' && '从 console.anthropic.com 获取'}
            </p>
          </div>

          {/* 模型选择 */}
          {currentProvider.models.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模型</label>
              <select
                value={aiConfig.model || currentProvider.defaultModel}
                onChange={e => {
                  setAiConfig({ ...aiConfig, model: e.target.value });
                  setTestResult(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                {currentProvider.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* 自定义API地址 */}
          {aiConfig.provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API地址</label>
              <input
                type="text"
                value={aiConfig.baseUrl || ''}
                onChange={e => {
                  setAiConfig({ ...aiConfig, baseUrl: e.target.value });
                  setTestResult(null);
                }}
                placeholder="https://api.xxx.com/v1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          {/* 测试和保存 */}
          <div className="flex items-center gap-3">
            <button
              onClick={testAiConfig}
              disabled={!aiConfig.apiKey || testResult === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
            >
              {testResult === 'testing' ? '测试中...' : '测试并保存'}
              {testResult === 'success' && <Check className="w-4 h-4" />}
            </button>
            {testResult === 'success' && (
              <span className="text-green-600 text-sm">配置已保存</span>
            )}
            {testResult === 'error' && (
              <span className="text-red-600 text-sm">连接失败，请检查Key</span>
            )}
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>💡 使用说明：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>配置后，在「筛选」页面可实时获取AI分析</li>
            <li>每次分析消耗少量API额度（约0.01元）</li>
            <li>Key保存在浏览器，换电脑需重新配置</li>
            <li>支持DeepSeek/OpenAI/Claude/自定义API</li>
          </ul>
        </div>
      </div>

      {/* 新闻API配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-500" />
          新闻数据配置
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          配置 RSSHub 或 TianAPI 获取实时财经新闻。RSSHub 免费、实时性最好；TianAPI 作为备用。
        </p>

        <div className="space-y-4">
          {/* RSSHub URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSSHub 地址（优先）
            </label>
            <input
              type="text"
              value={rsshubUrl}
              onChange={e => {
                setRsshubUrl(e.target.value);
                setRsshubTestResult(null);
              }}
              placeholder="https://your-rsshub.vercel.app"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-1">
              自托管 RSSHub 地址，免费获取实时新闻。部署教程：
              <a href="https://docs.rsshub.app/deploy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                docs.rsshub.app/deploy
              </a>
            </p>
          </div>

          {/* RSSHub 测试 */}
          <div className="flex items-center gap-3">
            <button
              onClick={testRsshubUrl}
              disabled={!rsshubUrl || rsshubTestResult === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {rsshubTestResult === 'testing' ? '测试中...' : '测试并保存'}
              {rsshubTestResult === 'success' && <Check className="w-4 h-4" />}
            </button>
            {rsshubTestResult === 'success' && (
              <span className="text-green-600 text-sm">RSSHub 配置已保存</span>
            )}
            {rsshubTestResult === 'error' && (
              <span className="text-red-600 text-sm">连接失败，请检查地址</span>
            )}
          </div>

          {/* 分隔线 */}
          <hr className="my-4" />

          {/* TianAPI Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Key className="w-4 h-4" />
              TianAPI Key（备用）
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={tianApiKey}
                onChange={e => {
                  setTianApiKey(e.target.value);
                  setTianTestResult(null);
                }}
                placeholder="输入TianAPI Key（可选）"
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              TianAPI 备用，每日100次免费额度。
              <a href="https://www.tianapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                tianapi.com
              </a>
            </p>
          </div>

          {/* TianAPI 测试 */}
          <div className="flex items-center gap-3">
            <button
              onClick={testTianApiKey}
              disabled={!tianApiKey || tianTestResult === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
            >
              {tianTestResult === 'testing' ? '测试中...' : '测试并保存'}
              {tianTestResult === 'success' && <Check className="w-4 h-4" />}
            </button>
            {tianTestResult === 'success' && (
              <span className="text-green-600 text-sm">TianAPI 配置已保存</span>
            )}
            {tianTestResult === 'error' && (
              <span className="text-red-600 text-sm">连接失败</span>
            )}
          </div>

          {/* 分隔线 */}
          <hr className="my-4" />

          {/* CORS 代理 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CORS 代理地址（生产环境必需）
            </label>
            <input
              type="text"
              value={corsProxyUrl}
              onChange={e => {
                setCorsProxyUrl(e.target.value);
                setCorsTestResult(null);
              }}
              placeholder="https://your-cors-proxy.workers.dev"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-1">
              解决跨域问题。推荐使用 Cloudflare Workers 自建代理。
              <a href="https://github.com/gallifreyCar/stock-helper/tree/main/cors-proxy-worker" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                查看部署教程
              </a>
            </p>
          </div>

          {/* CORS 代理测试 */}
          <div className="flex items-center gap-3">
            <button
              onClick={testCorsProxyUrl}
              disabled={!corsProxyUrl || corsTestResult === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {corsTestResult === 'testing' ? '测试中...' : '测试并保存'}
              {corsTestResult === 'success' && <Check className="w-4 h-4" />}
            </button>
            {corsTestResult === 'success' && (
              <span className="text-green-600 text-sm">CORS 代理配置已保存</span>
            )}
            {corsTestResult === 'error' && (
              <span className="text-red-600 text-sm">连接失败，请检查地址</span>
            )}
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>💡 说明：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>RSSHub</strong>：免费、实时、数据最全（开发环境可用）</li>
            <li><strong>TianAPI</strong>：每日100次免费额度，无需 CORS 代理</li>
            <li><strong>CORS 代理</strong>：生产环境访问东方财富 API 必需</li>
            <li>未配置 CORS 代理时，部分功能在生产环境不可用</li>
          </ul>
        </div>
      </div>

      {/* 数据管理 */}
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
              onClick={() => {
                exportData();
                alert('数据已导出！文件已保存到下载目录');
              }}
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
          <p>• 股票行情来自腾讯财经，基金净值来自天天基金</p>
          <p>• AI分析需要配置API Key，费用由你自己的账户承担</p>
          <p>• 本工具仅供参考，不构成投资建议</p>
        </div>
      </div>

      {/* 关于 */}
      <div className="text-center text-xs text-gray-400 space-y-1">
        <p>A股基金投资助手 v2.0</p>
        <p>
          Made by
          <a
            href="https://github.com/gallifreyCar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline ml-1"
          >
            gallifreyCar
          </a>
        </p>
        <p>数据仅供参考，投资需谨慎</p>
      </div>
    </div>
  );
}