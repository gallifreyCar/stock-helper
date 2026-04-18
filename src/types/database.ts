// Supabase 数据库类型定义

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'long-term' | 'short-term' | 'fund';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'long-term' | 'short-term' | 'fund';
        };
        Update: {
          name?: string;
          type?: 'long-term' | 'short-term' | 'fund';
        };
      };
      stock_transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          stock_code: string;
          stock_name: string;
          type: 'buy' | 'sell';
          date: string;
          price: number;
          quantity: number;
          fee: number;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          stock_code: string;
          stock_name: string;
          type: 'buy' | 'sell';
          date: string;
          price: number;
          quantity: number;
          fee?: number;
          amount: number;
        };
        Update: {
          stock_code?: string;
          stock_name?: string;
          type?: 'buy' | 'sell';
          date?: string;
          price?: number;
          quantity?: number;
          fee?: number;
          amount?: number;
        };
      };
      fund_transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          fund_code: string;
          fund_name: string;
          type: 'buy' | 'sell';
          date: string;
          nav: number;
          shares: number;
          amount: number;
          fee: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          fund_code: string;
          fund_name: string;
          type: 'buy' | 'sell';
          date: string;
          nav: number;
          shares: number;
          amount: number;
          fee?: number;
        };
        Update: {
          fund_code?: string;
          fund_name?: string;
          type?: 'buy' | 'sell';
          date?: string;
          nav?: number;
          shares?: number;
          amount?: number;
          fee?: number;
        };
      };
      price_alerts: {
        Row: {
          id: string;
          user_id: string;
          type: 'stock' | 'fund';
          code: string;
          name: string;
          alert_type: 'profit' | 'loss' | 'both';
          target_price: number;
          loss_price: number | null;
          enabled: boolean;
          triggered: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'stock' | 'fund';
          code: string;
          name: string;
          alert_type: 'profit' | 'loss' | 'both';
          target_price: number;
          loss_price?: number | null;
          enabled?: boolean;
        };
        Update: {
          enabled?: boolean;
          triggered?: boolean;
          target_price?: number;
          loss_price?: number | null;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          refresh_interval: number;
          show_notification: boolean;
          ai_provider: string | null;
          ai_api_key: string | null;
          ai_base_url: string | null;
          ai_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          refresh_interval?: number;
          show_notification?: boolean;
          ai_provider?: string | null;
          ai_api_key?: string | null;
          ai_base_url?: string | null;
          ai_model?: string | null;
        };
        Update: {
          refresh_interval?: number;
          show_notification?: boolean;
          ai_provider?: string | null;
          ai_api_key?: string | null;
          ai_base_url?: string | null;
          ai_model?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// 表名常量
export const TABLES = {
  ACCOUNTS: 'accounts',
  STOCK_TRANSACTIONS: 'stock_transactions',
  FUND_TRANSACTIONS: 'fund_transactions',
  PRICE_ALERTS: 'price_alerts',
  USER_SETTINGS: 'user_settings',
} as const;