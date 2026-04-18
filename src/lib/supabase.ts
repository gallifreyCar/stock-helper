// Supabase 客户端初始化 - 支持用户自定义配置

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const STORAGE_KEY = 'stock-helper-supabase-config';

// 从 localStorage 获取用户配置
function getSupabaseConfig(): { url: string; key: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      if (config.url && config.key) {
        return config;
      }
    }
  } catch (e) {
    console.error('Failed to load Supabase config:', e);
  }
  return null;
}

// 保存配置到 localStorage
export function saveSupabaseConfig(url: string, key: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
}

// 清除配置
export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// 检查是否已配置
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config?.url && config?.key);
}

// 获取当前配置的 URL（用于显示）
export function getSupabaseUrl(): string | null {
  const config = getSupabaseConfig();
  return config?.url || null;
}

// 创建 Supabase 客户端
function createSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config?.url || !config?.key) {
    return null;
  }

  try {
    return createClient<Database>(config.url, config.key, {
      auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (e) {
    console.error('Failed to create Supabase client:', e);
    return null;
  }
}

// 初始化时创建客户端
export const supabase = createSupabaseClient();

// 重新初始化客户端（配置更新后调用）
export function reinitSupabaseClient(): void {
  // 由于 supabase 是 const，我们需要让页面刷新来重新初始化
  // 或者改用 getter 函数
  window.location.reload();
}

// 动态获取客户端（推荐方式）
export function getSupabaseClient() {
  return createSupabaseClient();
}