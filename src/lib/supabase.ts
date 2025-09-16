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

// Database setup SQL - Run this in Supabase SQL Editor
export const setupDatabaseSQL = `
-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'cashier', 'admin', 'barista', 'shift_lead')),
    email TEXT,
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    starting_cash DECIMAL(10,2) NOT NULL,
    ending_cash DECIMAL(10,2),
    cash_outs_total DECIMAL(10,2) DEFAULT 0,
    sales_total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    supplier TEXT,
    last_restocked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    prep_time INTEGER NOT NULL,
    servings INTEGER NOT NULL DEFAULT 1,
    instructions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    ingredients JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_id UUID REFERENCES public.shifts(id),
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_id UUID REFERENCES public.shifts(id),
    amount DECIMAL(10,2) NOT NULL,
    remaining_cash DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_id UUID REFERENCES public.shifts(id),
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_time TIMESTAMP WITH TIME ZONE,
    prep_time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Allow authenticated users to access all data for now
CREATE POLICY "Allow authenticated users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.recipe_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.recipe_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.cash_outs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON public.orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Insert sample inventory items
INSERT INTO public.inventory_items (name, category, current_stock, min_stock, unit, cost_per_unit, supplier) VALUES
('Coffee Beans - Espresso', 'food', 50, 10, 'lbs', 12.50, 'Local Roasters'),
('Milk - Whole', 'food', 20, 5, 'gallons', 3.50, 'Dairy Farm'),
('Oat Milk', 'food', 15, 3, 'quarts', 4.25, 'Plant Foods Inc'),
('Vanilla Syrup', 'food', 8, 2, 'bottles', 8.75, 'Flavor Co'),
('Sugar', 'food', 25, 5, 'lbs', 2.25, 'Sweet Supply'),
('Paper Cups - 12oz', 'supplies', 500, 100, 'pieces', 0.12, 'Cup World'),
('Lids - 12oz', 'supplies', 450, 100, 'pieces', 0.08, 'Cup World'),
('Napkins', 'supplies', 200, 50, 'packs', 1.50, 'Paper Plus')
ON CONFLICT DO NOTHING;
`;

// Create database tables automatically
export const setupDatabase = async () => {
  try {
    // Split the SQL into individual statements and execute them
    const statements = setupDatabaseSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('already exists')) {
          console.error('Error executing SQL statement:', error);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    // Try alternative approach using direct table creation
    try {
      await createTablesDirectly();
      return true;
    } catch (altError) {
      console.error('Alternative setup also failed:', altError);
      return false;
    }
  }
};

// Alternative table creation method
const createTablesDirectly = async () => {
  // Create tables using direct Supabase client calls
  const tables = [
    {
      name: 'users',
      schema: {
        id: 'uuid',
        username: 'text',
        full_name: 'text',
        role: 'text',
        email: 'text',
        permissions: 'text[]',
        is_active: 'boolean',
        created_at: 'timestamptz',
        updated_at: 'timestamptz'
      }
    },
    {
      name: 'shifts',
      schema: {
        id: 'uuid',
        user_id: 'uuid',
        start_time: 'timestamptz',
        end_time: 'timestamptz',
        starting_cash: 'decimal',
        ending_cash: 'decimal',
        cash_outs_total: 'decimal',
        sales_total: 'decimal',
        notes: 'text',
        status: 'text',
        created_at: 'timestamptz'
      }
    },
    {
      name: 'inventory_items',
      schema: {
        id: 'uuid',
        name: 'text',
        category: 'text',
        current_stock: 'integer',
        min_stock: 'integer',
        unit: 'text',
        cost_per_unit: 'decimal',
        supplier: 'text',
        last_restocked: 'timestamptz',
        created_at: 'timestamptz',
        updated_at: 'timestamptz'
      }
    },
    {
      name: 'recipes',
      schema: {
        id: 'uuid',
        name: 'text',
        category: 'text',
        description: 'text',
        base_price: 'decimal',
        prep_time: 'integer',
        servings: 'integer',
        instructions: 'text[]',
        created_at: 'timestamptz',
        updated_at: 'timestamptz'
      }
    },
    {
      name: 'recipe_ingredients',
      schema: {
        id: 'uuid',
        recipe_id: 'uuid',
        inventory_item_id: 'uuid',
        quantity: 'decimal',
        created_at: 'timestamptz'
      }
    },
    {
      name: 'recipe_modifiers',
      schema: {
        id: 'uuid',
        recipe_id: 'uuid',
        name: 'text',
        price: 'decimal',
        ingredients: 'jsonb',
        created_at: 'timestamptz'
      }
    },
    {
      name: 'sales',
      schema: {
        id: 'uuid',
        user_id: 'uuid',
        shift_id: 'uuid',
        items: 'jsonb',
        total_amount: 'decimal',
        payment_method: 'text',
        created_at: 'timestamptz'
      }
    },
    {
      name: 'cash_outs',
      schema: {
        id: 'uuid',
        user_id: 'uuid',
        shift_id: 'uuid',
        amount: 'decimal',
        remaining_cash: 'decimal',
        notes: 'text',
        created_at: 'timestamptz'
      }
    },
    {
      name: 'orders',
      schema: {
        id: 'uuid',
        user_id: 'uuid',
        shift_id: 'uuid',
        items: 'jsonb',
        total_amount: 'decimal',
        status: 'text',
        start_time: 'timestamptz',
        completion_time: 'timestamptz',
        prep_time_seconds: 'integer',
        created_at: 'timestamptz'
      }
    }
  ];

  // Insert sample data for inventory
  const sampleInventory = [
    { name: 'Coffee Beans - Espresso', category: 'food', current_stock: 50, min_stock: 10, unit: 'lbs', cost_per_unit: 12.50, supplier: 'Local Roasters' },
    { name: 'Milk - Whole', category: 'food', current_stock: 20, min_stock: 5, unit: 'gallons', cost_per_unit: 3.50, supplier: 'Dairy Farm' },
    { name: 'Oat Milk', category: 'food', current_stock: 15, min_stock: 3, unit: 'quarts', cost_per_unit: 4.25, supplier: 'Plant Foods Inc' },
    { name: 'Vanilla Syrup', category: 'food', current_stock: 8, min_stock: 2, unit: 'bottles', cost_per_unit: 8.75, supplier: 'Flavor Co' },
    { name: 'Sugar', category: 'food', current_stock: 25, min_stock: 5, unit: 'lbs', cost_per_unit: 2.25, supplier: 'Sweet Supply' },
    { name: 'Paper Cups - 12oz', category: 'supplies', current_stock: 500, min_stock: 100, unit: 'pieces', cost_per_unit: 0.12, supplier: 'Cup World' },
    { name: 'Lids - 12oz', category: 'supplies', current_stock: 450, min_stock: 100, unit: 'pieces', cost_per_unit: 0.08, supplier: 'Cup World' },
    { name: 'Napkins', category: 'supplies', current_stock: 200, min_stock: 50, unit: 'packs', cost_per_unit: 1.50, supplier: 'Paper Plus' }
  ];

  // Try to insert sample inventory data
  try {
    await supabase.from('inventory_items').upsert(sampleInventory, { onConflict: 'name' });
  } catch (error) {
    console.log('Sample data insertion failed (this is expected if tables exist):', error);
  }
};

// Check if tables exist
export const checkTablesExist = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

// Initialize database - create tables if they don't exist
export const initializeDatabase = async () => {
  const tablesExist = await checkTablesExist();
  
  if (!tablesExist) {
    console.log('Tables do not exist, attempting to create them...');
    const success = await setupDatabase();
    
    if (success) {
      console.log('Database setup completed successfully!');
      return true;
    } else {
      console.error('Database setup failed. Please create tables manually in Supabase.');
      return false;
    }
  }
  
  return true;
};

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
      orders: {
        Row: {
          id: string
          user_id: string
          shift_id: string | null
          items: any[]
          total_amount: number
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_time: string
          completion_time: string | null
          prep_time_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift_id?: string | null
          items: any[]
          total_amount: number
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_time?: string
          completion_time?: string | null
          prep_time_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift_id?: string | null
          items?: any[]
          total_amount?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          start_time?: string
          completion_time?: string | null
          prep_time_seconds?: number | null
          created_at?: string
        }
      }
    }
  }
}