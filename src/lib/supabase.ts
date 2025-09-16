import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'undefined') {
  console.error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Create a fallback client if env vars are missing to prevent runtime errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string
          role: 'manager' | 'cashier' | 'admin' | 'barista' | 'shift_lead'
          created_at: string
          updated_at: string
          is_active: boolean
          email?: string
          permissions: string[]
        }
        Insert: {
          id?: string
          username: string
          full_name: string
          role: 'manager' | 'cashier' | 'admin' | 'barista' | 'shift_lead'
          created_at?: string
          updated_at?: string
          is_active?: boolean
          email?: string
          permissions?: string[]
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          role?: 'manager' | 'cashier' | 'admin' | 'barista' | 'shift_lead'
          created_at?: string
          updated_at?: string
          is_active?: boolean
          email?: string
          permissions?: string[]
        }
      }
      shifts: {
        Row: {
          id: string
          user_id: string
          start_time: string
          end_time: string | null
          starting_cash: number
          ending_cash: number | null
          cash_outs_total: number
          sales_total: number
          notes: string | null
          status: 'active' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_time?: string
          end_time?: string | null
          starting_cash: number
          ending_cash?: number | null
          cash_outs_total?: number
          sales_total?: number
          notes?: string | null
          status?: 'active' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_time?: string
          end_time?: string | null
          starting_cash?: number
          ending_cash?: number | null
          cash_outs_total?: number
          sales_total?: number
          notes?: string | null
          status?: 'active' | 'completed'
          created_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          category: string
          current_stock: number
          min_stock: number
          unit: string
          cost_per_unit: number
          supplier: string
          last_restocked: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          current_stock: number
          min_stock: number
          unit: string
          cost_per_unit: number
          supplier: string
          last_restocked?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          current_stock?: number
          min_stock?: number
          unit?: string
          cost_per_unit?: number
          supplier?: string
          last_restocked?: string
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          category: string
          description: string
          base_price: number
          prep_time: number
          servings: number
          instructions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          description: string
          base_price: number
          prep_time: number
          servings: number
          instructions: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          description?: string
          base_price?: number
          prep_time?: number
          servings?: number
          instructions?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          inventory_item_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          inventory_item_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          inventory_item_id?: string
          quantity?: number
          created_at?: string
        }
      }
      recipe_modifiers: {
        Row: {
          id: string
          recipe_id: string
          name: string
          price: number
          ingredients: any[] | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          price: number
          ingredients?: any[] | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          price?: number
          ingredients?: any[] | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          shift_id: string | null
          items: any[]
          total_amount: number
          payment_method: 'cash' | 'card'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift_id?: string | null
          items: any[]
          total_amount: number
          payment_method: 'cash' | 'card'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift_id?: string | null
          items?: any[]
          total_amount?: number
          payment_method?: 'cash' | 'card'
          created_at?: string
        }
      }
      cash_outs: {
        Row: {
          id: string
          user_id: string
          shift_id: string | null
          amount: number
          remaining_cash: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift_id?: string | null
          amount: number
          remaining_cash: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift_id?: string | null
          amount?: number
          remaining_cash?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}