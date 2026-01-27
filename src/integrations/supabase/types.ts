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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      combo_promotion_items: {
        Row: {
          combo_promotion_id: string
          created_at: string
          id: string
          is_free_item: boolean
          quantity_required: number
          recipe_id: string
        }
        Insert: {
          combo_promotion_id: string
          created_at?: string
          id?: string
          is_free_item?: boolean
          quantity_required?: number
          recipe_id: string
        }
        Update: {
          combo_promotion_id?: string
          created_at?: string
          id?: string
          is_free_item?: boolean
          quantity_required?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_promotion_items_combo_promotion_id_fkey"
            columns: ["combo_promotion_id"]
            isOneToOne: false
            referencedRelation: "combo_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_promotion_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          free_quantity: number | null
          id: string
          is_active: boolean
          min_quantity: number | null
          name: string
          promotion_type: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date: string
          free_quantity?: number | null
          id?: string
          is_active?: boolean
          min_quantity?: number | null
          name: string
          promotion_type?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          free_quantity?: number | null
          id?: string
          is_active?: boolean
          min_quantity?: number | null
          name?: string
          promotion_type?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          id: string
          points: number
          sale_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          id?: string
          points: number
          sale_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          points?: number
          sale_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          id: string
          membership_tier: string
          name: string
          phone: string | null
          points: number
          total_spent: number
          updated_at: string
          visit_count: number
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          membership_tier?: string
          name: string
          phone?: string | null
          points?: number
          total_spent?: number
          updated_at?: string
          visit_count?: number
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          membership_tier?: string
          name?: string
          phone?: string | null
          points?: number
          total_spent?: number
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
      inventory_count_items: {
        Row: {
          actual_count: number
          count_id: string
          created_at: string
          discrepancy: number | null
          id: string
          inventory_item_id: string
          system_count: number
        }
        Insert: {
          actual_count?: number
          count_id: string
          created_at?: string
          discrepancy?: number | null
          id?: string
          inventory_item_id: string
          system_count?: number
        }
        Update: {
          actual_count?: number
          count_id?: string
          created_at?: string
          discrepancy?: number | null
          id?: string
          inventory_item_id?: string
          system_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          discrepancies_count: number
          id: string
          notes: string | null
          status: string
          total_items: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discrepancies_count?: number
          id?: string
          notes?: string | null
          status?: string
          total_items?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          discrepancies_count?: number
          id?: string
          notes?: string | null
          status?: string
          total_items?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          photo_url: string | null
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
          photo_url?: string | null
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
          photo_url?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_events: {
        Row: {
          created_at: string
          end_date: string
          event_type: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          event_type?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          event_type?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          points_spent: number
          redeemed_by: string
          reward_id: string | null
          sale_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          points_spent: number
          redeemed_by: string
          reward_id?: string | null
          sale_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          points_spent?: number
          redeemed_by?: string
          reward_id?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          points_cost: number
          recipe_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          points_cost: number
          recipe_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number
          recipe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
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
      promotion_recipes: {
        Row: {
          created_at: string
          id: string
          promotion_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          promotion_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          promotion_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_recipes_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          min_purchase_amount: number | null
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date: string
          id?: string
          is_active?: boolean
          min_purchase_amount?: number | null
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          min_purchase_amount?: number | null
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
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
      recipe_sizes: {
        Row: {
          created_at: string
          id: string
          ingredient_multiplier: number
          is_active: boolean
          is_default: boolean
          name: string
          price_adjustment: number
          recipe_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_multiplier?: number
          is_active?: boolean
          is_default?: boolean
          name: string
          price_adjustment?: number
          recipe_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_multiplier?: number
          is_active?: boolean
          is_default?: boolean
          name?: string
          price_adjustment?: number
          recipe_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_sizes_recipe_id_fkey"
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
          has_sizes: boolean
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
          has_sizes?: boolean
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
          has_sizes?: boolean
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
      restock_history: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          inventory_item_id: string
          quantity_added: number
          restock_order_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity_added: number
          restock_order_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity_added?: number
          restock_order_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
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
          customer_id?: string | null
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
          customer_id?: string | null
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
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
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
      units: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          picture_url: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          picture_url?: string | null
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          picture_url?: string | null
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
      get_current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      combo_promotion_type: "buy_x_get_y" | "bundle" | "quantity_discount"
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
    Enums: {
      combo_promotion_type: ["buy_x_get_y", "bundle", "quantity_discount"],
    },
  },
} as const
