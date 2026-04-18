export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      fund_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          date: string
          fee: number | null
          fund_code: string
          fund_name: string
          id: string
          nav: number
          shares: number
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          date: string
          fee?: number | null
          fund_code: string
          fund_name: string
          id?: string
          nav: number
          shares: number
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          date?: string
          fee?: number | null
          fund_code?: string
          fund_name?: string
          id?: string
          nav?: number
          shares?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          code: string
          created_at: string | null
          enabled: boolean | null
          id: string
          loss_price: number | null
          name: string
          target_price: number
          triggered: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          alert_type: string
          code: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          loss_price?: number | null
          name: string
          target_price: number
          triggered?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          alert_type?: string
          code?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          loss_price?: number | null
          name?: string
          target_price?: number
          triggered?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          date: string
          fee: number | null
          id: string
          price: number
          quantity: number
          stock_code: string
          stock_name: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          date: string
          fee?: number | null
          id?: string
          price: number
          quantity: number
          stock_code: string
          stock_name: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          date?: string
          fee?: number | null
          id?: string
          price?: number
          quantity?: number
          stock_code?: string
          stock_name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_api_key: string | null
          ai_base_url: string | null
          ai_model: string | null
          ai_provider: string | null
          created_at: string | null
          refresh_interval: number | null
          show_notification: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_api_key?: string | null
          ai_base_url?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          refresh_interval?: number | null
          show_notification?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_api_key?: string | null
          ai_base_url?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          created_at?: string | null
          refresh_interval?: number | null
          show_notification?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

export const TABLES = {
  ACCOUNTS: 'accounts',
  STOCK_TRANSACTIONS: 'stock_transactions',
  FUND_TRANSACTIONS: 'fund_transactions',
  PRICE_ALERTS: 'price_alerts',
  USER_SETTINGS: 'user_settings',
} as const;