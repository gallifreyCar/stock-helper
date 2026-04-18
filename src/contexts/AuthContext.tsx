// 认证上下文 - 管理 Supabase 登录状态

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export type AuthMode = 'online' | 'offline' | 'unconfigured';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authMode: AuthMode;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  switchToOffline: () => void;
  recheckConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('unconfigured');
  const [configured, setConfigured] = useState(false);

  const checkConfig = () => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);

    // 检查是否选择离线模式
    const savedMode = localStorage.getItem('stock-helper-auth-mode');
    if (savedMode === 'offline') {
      setAuthMode('offline');
      setLoading(false);
      return false;
    }

    if (!isConfig) {
      setAuthMode('unconfigured');
      setLoading(false);
      return false;
    }

    setAuthMode('online');
    return true;
  };

  useEffect(() => {
    const shouldInit = checkConfig();

    if (!shouldInit) return;

    // 获取当前 session
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase 未配置' };

    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string) => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase 未配置' as string, needsVerification: undefined };

    const { data, error } = await client.auth.signUp({ email, password });
    const needsVerification: boolean | undefined = data.user && !data.session ? true : undefined;
    return { error: error?.message as string | undefined, needsVerification };
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase 未配置' };

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    return { error: error?.message };
  };

  const switchToOffline = () => {
    setAuthMode('offline');
    localStorage.setItem('stock-helper-auth-mode', 'offline');
    setUser(null);
    setSession(null);
  };

  const recheckConfig = () => {
    checkConfig();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authMode,
      isConfigured: configured,
      signIn,
      signUp,
      signOut,
      resetPassword,
      switchToOffline,
      recheckConfig,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}