import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout, Dashboard, Portfolio, Screener, Alerts, Settings, Analysis } from './components';
import { LoginPage, RegisterPage, DataMigration, SupabaseConfig } from './components/auth';
import type { StorageData } from './types';
import { getSupabaseClient } from './lib/supabase';

// 认证保护组件
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, authMode } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [localData, setLocalData] = useState<StorageData | null>(null);

  useEffect(() => {
    if (!loading && user) {
      // 检查是否已迁移过
      const migrated = localStorage.getItem('stock-helper-migrated');
      if (migrated === user.id) {
        setShowMigration(false);
        return;
      }

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
        onSkip={() => {
          localStorage.setItem('stock-helper-auth-mode', 'offline');
          window.location.reload();
        }}
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

// 数据迁移包装器 - 真正同步到云端
function DataMigrationWrapper({
  localData,
  onComplete,
  onSkip,
}: {
  localData: StorageData;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    if (!user?.id) {
      setError('用户未登录');
      return;
    }

    setMigrating(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase 未配置');
      setMigrating(false);
      return;
    }

    try {
      // 同步账户
      for (const account of localData.accounts) {
        const { error: accError } = await supabase.from('accounts').insert({
          user_id: user.id,
          name: account.name,
          type: account.type,
        });
        if (accError) console.error('Account insert error:', accError);
      }

      // 同步股票交易（需要先获取账户的云端 ID）
      const { data: cloudAccounts, error: fetchError } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      if (fetchError) console.error('Fetch accounts error:', fetchError);

      const accountMap: Record<string, string> = {};
      (cloudAccounts || []).forEach(acc => {
        const localAcc = localData.accounts.find(a => a.name === acc.name);
        if (localAcc) {
          accountMap[localAcc.id] = acc.id;
        }
      });

      for (const tx of localData.stockTransactions) {
        const cloudAccountId = accountMap[tx.accountId] || Object.values(accountMap)[0];
        if (cloudAccountId) {
          const { error: txError } = await supabase.from('stock_transactions').insert({
            user_id: user.id,
            account_id: cloudAccountId,
            stock_code: tx.stockCode,
            stock_name: tx.stockName,
            type: tx.type,
            date: tx.date,
            price: tx.price,
            quantity: tx.quantity,
            fee: tx.fee,
            amount: tx.amount,
          });
          if (txError) console.error('Stock tx error:', txError);
        }
      }

      // 同步基金交易
      for (const tx of localData.fundTransactions) {
        const cloudAccountId = accountMap[tx.accountId] || Object.values(accountMap)[0];
        if (cloudAccountId) {
          const { error: txError } = await supabase.from('fund_transactions').insert({
            user_id: user.id,
            account_id: cloudAccountId,
            fund_code: tx.fundCode,
            fund_name: tx.fundName,
            type: tx.type,
            date: tx.date,
            nav: tx.nav,
            shares: tx.shares,
            amount: tx.amount,
            fee: tx.fee,
          });
          if (txError) console.error('Fund tx error:', txError);
        }
      }

      // 同步价格提醒
      for (const alert of localData.alerts) {
        const { error: alertError } = await supabase.from('price_alerts').insert({
          user_id: user.id,
          type: alert.type,
          code: alert.code,
          name: alert.name,
          alert_type: alert.alertType,
          target_price: alert.targetPrice,
          loss_price: alert.lossPrice,
          enabled: alert.enabled,
        });
        if (alertError) console.error('Alert error:', alertError);
      }

      // 同步设置
      if (localData.settings) {
        const { error: settingsError } = await supabase.from('user_settings').upsert({
          user_id: user.id,
          refresh_interval: localData.settings.refreshInterval,
          show_notification: localData.settings.showNotification,
          ai_provider: localData.settings.aiConfig?.provider,
          ai_api_key: localData.settings.aiConfig?.apiKey,
          ai_base_url: localData.settings.aiConfig?.baseUrl,
          ai_model: localData.settings.aiConfig?.model,
        });
        if (settingsError) console.error('Settings error:', settingsError);
      }

      // 清除本地数据
      localStorage.removeItem('stock-helper-data');
      localStorage.removeItem('stock-helper-migration-pending');
      // 标记已迁移（与用户ID绑定）
      localStorage.setItem('stock-helper-migrated', user.id);

      // 显示成功状态
      setMigrated(true);
      setMigrating(false);
    } catch (e) {
      console.error('Migration failed:', e);
      setError((e as Error).message || '迁移失败，请重试');
      setMigrating(false);
    }
  };

  // 迁移成功后的处理
  const handleComplete = () => {
    onComplete();
  };

  return (
    <DataMigration
      localData={localData}
      onMigrate={handleMigrate}
      onSkip={onSkip}
      migrating={migrating}
      migrated={migrated}
      error={error}
      onComplete={handleComplete}
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
                  <Route path="/analysis" element={<Analysis />} />
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