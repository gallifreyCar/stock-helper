import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout, Dashboard, Portfolio, Screener, Alerts, Settings } from './components';
import { LoginPage, RegisterPage, DataMigration, SupabaseConfig } from './components/auth';
import type { StorageData } from './types';

// 认证保护组件
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authMode, recheckConfig } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [localData, setLocalData] = useState<StorageData | null>(null);

  useEffect(() => {
    if (!loading && user) {
      // 检查本地是否有待迁移数据
      const saved = localStorage.getItem('stock-helper-data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.accounts?.length > 0 ||
              parsed.stockTransactions?.length > 0 ||
              parsed.fundTransactions?.length > 0) {
            setLocalData(parsed);
            setShowMigration(true);
          }
        } catch (e) {
          console.error('Failed to parse local data:', e);
        }
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 未配置时显示配置页面
  if (authMode === 'unconfigured') {
    return (
      <SupabaseConfig
        onConfigured={() => {
          recheckConfig();
        }}
        onSkip={() => {}}
      />
    );
  }

  // 离线模式直接进入应用
  if (authMode === 'offline') {
    return <>{children}</>;
  }

  // 未登录跳转到登录页
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 显示数据迁移提示
  if (showMigration && localData) {
    return (
      <DataMigrationWrapper
        localData={localData}
        onComplete={() => setShowMigration(false)}
        onSkip={() => setShowMigration(false)}
      />
    );
  }

  return <>{children}</>;
}

// 数据迁移包装器
function DataMigrationWrapper({
  localData,
  onComplete,
  onSkip,
}: {
  localData: StorageData;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const handleMigrate = async () => {
    localStorage.setItem('stock-helper-migration-pending', JSON.stringify(localData));
    onComplete();
  };

  return (
    <DataMigration
      localData={localData}
      onMigrate={handleMigrate}
      onSkip={onSkip}
    />
  );
}

// 认证页面路由
function AuthRoutes() {
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'reset' | 'config'>('login');
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (authPage === 'config') {
    return (
      <SupabaseConfig
        onConfigured={() => setAuthPage('login')}
        onSkip={() => setAuthPage('login')}
      />
    );
  }

  if (authPage === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthPage('register')}
        onResetPassword={() => setAuthPage('reset')}
        onSwitchToConfig={() => setAuthPage('config')}
      />
    );
  }

  if (authPage === 'register') {
    return <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />;
  }

  return <ResetPasswordPage onBack={() => setAuthPage('login')} />;
}

// 重置密码页面
function ResetPasswordPage({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await resetPassword(email);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">邮件已发送</h2>
          <p className="text-gray-600 mb-4">请检查您的邮箱并点击重置链接</p>
          <button onClick={onBack} className="text-blue-600 hover:underline">
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">重置密码</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="输入您的邮箱"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg">
            发送重置邮件
          </button>
        </form>
        <button onClick={onBack} className="mt-4 text-gray-500 hover:text-blue-600">
          返回登录
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthRoutes />} />
          <Route path="/*" element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/screener" element={<Screener />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </AuthGuard>
          } />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;