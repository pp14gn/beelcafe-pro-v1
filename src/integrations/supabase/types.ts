export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_outs: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string | null
          shift_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_outs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_outs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          cost_per_unit: number
          created_at: string
          current_stock: number
          id: string
          last_restocked: string | null
          min_stock: number
          name: string
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          min_stock?: number
          name: string
          supplier?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          min_stock?: number
          name?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          completion_time: string | null
          created_at: string
          customer_name: string | null
          id: string
          items: Json
          prep_time_seconds: number | null
          shift_id: string | null
          start_time: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_time?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          items: Json
          prep_time_seconds?: number | null
          shift_id?: string | null
          start_time?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_time?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          prep_time_seconds?: number | null
          shift_id?: string | null
          start_time?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          quantity: number
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity: number
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_modifiers: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          is_active: boolean
          quantity: number | null
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          is_active?: boolean
          quantity?: number | null
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_active?: boolean
          quantity?: number | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recipe_modifiers_inventory_item"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_modifiers_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          base_price: number
          category: string
          created_at: string
          description: string | null
          id: string
          instructions: Json | null
          is_active: boolean
          name: string
          prep_time: number | null
          servings: number | null
          updated_at: string
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          name: string
          prep_time?: number | null
          servings?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          name?: string
          prep_time?: number | null
          servings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          id: string
          items: Json
          payment_method: string
          shift_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          payment_method: string
          shift_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          payment_method?: string
          shift_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          cash_outs_total: number | null
          created_at: string
          end_time: string | null
          ending_cash: number | null
          id: string
          sales_total: number | null
          start_time: string
          starting_cash: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_outs_total?: number | null
          created_at?: string
          end_time?: string | null
          ending_cash?: number | null
          id?: string
          sales_total?: number | null
          start_time?: string
          starting_cash?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_outs_total?: number | null
          created_at?: string
          end_time?: string | null
          ending_cash?: number | null
          id?: string
          sales_total?: number | null
          start_time?: string
          starting_cash?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
