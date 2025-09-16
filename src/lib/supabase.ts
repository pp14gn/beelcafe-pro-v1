import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string
          role: 'manager' | 'cashier' | 'admin'
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          username: string
          full_name: string
          role: 'manager' | 'cashier' | 'admin'
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          role?: 'manager' | 'cashier' | 'admin'
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          items: any[]
          total_amount: number
          payment_method: 'cash' | 'card'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items: any[]
          total_amount: number
          payment_method: 'cash' | 'card'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: any[]
          total_amount?: number
          payment_method?: 'cash' | 'card'
          created_at?: string
        }
      }
    }
  }
}