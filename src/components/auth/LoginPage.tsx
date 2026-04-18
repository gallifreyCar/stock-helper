// 登录页面

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onResetPassword: () => void;
}

export function LoginPage({ onSwitchToRegister, onResetPassword }: LoginPageProps) {
  const { signIn, switchToOffline } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">投资助手</h1>
          <p className="text-gray-500 mt-2">登录以同步您的数据到云端</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" /> 邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" /> 密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中...
              </>
            ) : '登录'}
          </button>
        </form>

        {/* 其他选项 */}
        <div className="mt-6 flex justify-between text-sm">
          <button onClick={onResetPassword} className="text-gray-500 hover:text-blue-600">
            忘记密码？
          </button>
          <button onClick={onSwitchToRegister} className="text-blue-600 hover:text-blue-700 font-medium">
            注册新账户
          </button>
        </div>

        {/* 离线模式 */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-3">不想登录？可以使用离线模式</p>
          <button
            onClick={switchToOffline}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            继续离线使用 →
          </button>
          <p className="text-xs text-gray-400 mt-2">离线模式下数据仅保存在本地浏览器</p>
        </div>
      </div>
    </div>
  );
}