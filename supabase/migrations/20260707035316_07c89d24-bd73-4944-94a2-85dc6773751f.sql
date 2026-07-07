-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')) DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS picture_url TEXT;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.users;
CREATE POLICY "Admins and managers can view all profiles" ON public.users FOR SELECT USING (public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Users can insert profiles" ON public.users;
CREATE POLICY "Users can insert profiles" ON public.users FOR INSERT WITH CHECK (auth.uid() = id OR (auth.jwt() ->> 'role') = ANY (ARRAY['admin','manager']) OR auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins and managers can update users" ON public.users;
CREATE POLICY "Admins and managers can update users" ON public.users FOR UPDATE USING (public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Admins and managers can delete users" ON public.users;
CREATE POLICY "Admins and managers can delete users" ON public.users FOR DELETE USING (public.get_current_user_role() IN ('admin','manager'));

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  photo_url TEXT,
  usage_unit TEXT,
  usage_per_stock_unit NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers and admins can view inventory items" ON public.inventory_items;
CREATE POLICY "Managers and admins can view inventory items" ON public.inventory_items FOR SELECT USING (public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Managers and admins can insert inventory items" ON public.inventory_items;
CREATE POLICY "Managers and admins can insert inventory items" ON public.inventory_items FOR INSERT WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Managers and admins can update inventory items" ON public.inventory_items;
CREATE POLICY "Managers and admins can update inventory items" ON public.inventory_items FOR UPDATE USING (public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Admins can delete inventory items" ON public.inventory_items;
CREATE POLICY "Admins can delete inventory items" ON public.inventory_items FOR DELETE USING (public.get_current_user_role() = 'admin');
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  starting_cash DECIMAL(10,2) DEFAULT 0,
  ending_cash DECIMAL(10,2),
  sales_total DECIMAL(10,2) DEFAULT 0,
  cash_outs_total DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
CREATE POLICY "Users can view their own shifts" ON public.shifts FOR SELECT USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Users can create their own shifts" ON public.shifts;
CREATE POLICY "Users can create their own shifts" ON public.shifts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
CREATE POLICY "Users can update their own shifts" ON public.shifts FOR UPDATE USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP TRIGGER IF EXISTS update_shifts_updated_at ON public.shifts;
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  points NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  birthday DATE,
  membership_tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
CREATE POLICY "Authenticated users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
CREATE POLICY "Authenticated users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Only admins can delete customers" ON public.customers;
CREATE POLICY "Only admins can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
CREATE POLICY "Users can view their own sales" ON public.sales FOR SELECT USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
CREATE POLICY "Users can create their own sales" ON public.sales FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','cancelled')) DEFAULT 'pending',
  start_time TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  prep_time_seconds INTEGER,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cash_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_outs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own cash outs" ON public.cash_outs;
CREATE POLICY "Users can view their own cash outs" ON public.cash_outs FOR SELECT USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));
DROP POLICY IF EXISTS "Users can create their own cash outs" ON public.cash_outs;
CREATE POLICY "Users can create their own cash outs" ON public.cash_outs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_cash_outs_updated_at ON public.cash_outs;
CREATE TRIGGER update_cash_outs_updated_at BEFORE UPDATE ON public.cash_outs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  prep_time INTEGER,
  servings INTEGER DEFAULT 1,
  instructions JSONB,
  photo_url TEXT,
  has_sizes BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active recipes" ON public.recipes;
CREATE POLICY "Authenticated users can view active recipes" ON public.recipes FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR public.get_current_user_role() IN ('admin','manager')));
DROP POLICY IF EXISTS "Managers and admins can manage recipes" ON public.recipes;
CREATE POLICY "Managers and admins can manage recipes" ON public.recipes FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP TRIGGER IF EXISTS update_recipes_updated_at ON public.recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, inventory_item_id)
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Authenticated users can view recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Managers and admins can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Managers and admins can manage recipe ingredients" ON public.recipe_ingredients FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE TABLE IF NOT EXISTS public.recipe_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, inventory_item_id)
);
ALTER TABLE public.recipe_modifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active recipe modifiers" ON public.recipe_modifiers;
CREATE POLICY "Authenticated users can view active recipe modifiers" ON public.recipe_modifiers FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR public.get_current_user_role() IN ('admin','manager')));
DROP POLICY IF EXISTS "Managers and admins can manage recipe modifiers" ON public.recipe_modifiers;
CREATE POLICY "Managers and admins can manage recipe modifiers" ON public.recipe_modifiers FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE TABLE IF NOT EXISTS public.recipe_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  ingredient_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active recipe sizes" ON public.recipe_sizes;
CREATE POLICY "Authenticated users can view active recipe sizes" ON public.recipe_sizes FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = true OR public.get_current_user_role() IN ('admin','manager')));
DROP POLICY IF EXISTS "Managers and admins can manage recipe sizes" ON public.recipe_sizes;
CREATE POLICY "Managers and admins can manage recipe sizes" ON public.recipe_sizes FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP TRIGGER IF EXISTS update_recipe_sizes_updated_at ON public.recipe_sizes;
CREATE TRIGGER update_recipe_sizes_updated_at BEFORE UPDATE ON public.recipe_sizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('recipe','inventory')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
CREATE POLICY "Everyone can view categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can manage categories" ON public.categories;
CREATE POLICY "Only admins can manage categories" ON public.categories FOR ALL USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.categories (name, type) VALUES
  ('Beverages','recipe'), ('Food','recipe'), ('Desserts','recipe'), ('Snacks','recipe'),
  ('Coffee Beans','inventory'), ('Dairy','inventory'), ('Syrups','inventory'), ('Supplies','inventory')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view units" ON public.units;
CREATE POLICY "Everyone can view units" ON public.units FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can manage units" ON public.units;
CREATE POLICY "Only admins can manage units" ON public.units FOR ALL USING (public.get_current_user_role() = 'admin') WITH CHECK (public.get_current_user_role() = 'admin');
DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.units (name, abbreviation, type) VALUES
  ('Kilogram','kg','weight'), ('Gram','g','weight'), ('Pound','lb','weight'), ('Ounce','oz','weight'),
  ('Liter','L','volume'), ('Milliliter','ml','volume'), ('Cup','cup','volume'),
  ('Tablespoon','tbsp','volume'), ('Teaspoon','tsp','volume'),
  ('Piece','pc','count'), ('Dozen','dz','count'),
  ('Pack','pack','general'), ('Box','box','general'), ('Bag','bag','general')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earn','redeem')),
  points NUMERIC NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view customer transactions" ON public.customer_transactions;
CREATE POLICY "Authenticated users can view customer transactions" ON public.customer_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert customer transactions" ON public.customer_transactions;
CREATE POLICY "Authenticated users can insert customer transactions" ON public.customer_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 2,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  event_type TEXT NOT NULL DEFAULT 'multiplier',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  points_spent INTEGER NOT NULL,
  redeemed_by UUID NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View active rewards" ON public.loyalty_rewards;
CREATE POLICY "View active rewards" ON public.loyalty_rewards FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active=true OR public.get_current_user_role() IN ('admin','manager')));
DROP POLICY IF EXISTS "Manage rewards" ON public.loyalty_rewards;
CREATE POLICY "Manage rewards" ON public.loyalty_rewards FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "View active events" ON public.loyalty_events;
CREATE POLICY "View active events" ON public.loyalty_events FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active=true OR public.get_current_user_role() IN ('admin','manager')));
DROP POLICY IF EXISTS "Manage events" ON public.loyalty_events;
CREATE POLICY "Manage events" ON public.loyalty_events FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "View redemptions" ON public.loyalty_redemptions;
CREATE POLICY "View redemptions" ON public.loyalty_redemptions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Create redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Create redemptions" ON public.loyalty_redemptions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP TRIGGER IF EXISTS update_loyalty_rewards_updated_at ON public.loyalty_rewards;
CREATE TRIGGER update_loyalty_rewards_updated_at BEFORE UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_loyalty_events_updated_at ON public.loyalty_events;
CREATE TRIGGER update_loyalty_events_updated_at BEFORE UPDATE ON public.loyalty_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL DEFAULT 0,
  discrepancies_count INTEGER NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inventory_count_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  system_count NUMERIC NOT NULL DEFAULT 0,
  actual_count NUMERIC NOT NULL DEFAULT 0,
  discrepancy NUMERIC GENERATED ALWAYS AS (actual_count - system_count) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View inventory counts" ON public.inventory_counts;
CREATE POLICY "View inventory counts" ON public.inventory_counts FOR SELECT USING (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "Create inventory counts" ON public.inventory_counts;
CREATE POLICY "Create inventory counts" ON public.inventory_counts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Update inventory counts" ON public.inventory_counts;
CREATE POLICY "Update inventory counts" ON public.inventory_counts FOR UPDATE USING (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "View count items" ON public.inventory_count_items;
CREATE POLICY "View count items" ON public.inventory_count_items FOR SELECT USING (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "Create count items" ON public.inventory_count_items;
CREATE POLICY "Create count items" ON public.inventory_count_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_counts WHERE id = count_id AND user_id = auth.uid()));
DROP POLICY IF EXISTS "Update count items" ON public.inventory_count_items;
CREATE POLICY "Update count items" ON public.inventory_count_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.inventory_counts WHERE id = count_id AND user_id = auth.uid()));
DROP TRIGGER IF EXISTS update_inventory_counts_updated_at ON public.inventory_counts;
CREATE TRIGGER update_inventory_counts_updated_at BEFORE UPDATE ON public.inventory_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.restock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL,
  restock_order_id TEXT,
  quantity_added NUMERIC NOT NULL,
  cost NUMERIC,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.restock_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Create restock records" ON public.restock_history;
CREATE POLICY "Create restock records" ON public.restock_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "View restock history" ON public.restock_history;
CREATE POLICY "View restock history" ON public.restock_history FOR SELECT USING (public.get_current_user_role() IN ('admin','manager'));
DROP TRIGGER IF EXISTS update_restock_history_updated_at ON public.restock_history;
CREATE TRIGGER update_restock_history_updated_at BEFORE UPDATE ON public.restock_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own settings" ON public.user_settings;
CREATE POLICY "View own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Create own settings" ON public.user_settings;
CREATE POLICY "Create own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Update own settings" ON public.user_settings;
CREATE POLICY "Update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Delete own settings" ON public.user_settings;
CREATE POLICY "Delete own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_purchase_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.promotion_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, recipe_id)
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View active promotions" ON public.promotions;
CREATE POLICY "View active promotions" ON public.promotions FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Manage promotions" ON public.promotions;
CREATE POLICY "Manage promotions" ON public.promotions FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "View promotion recipes" ON public.promotion_recipes;
CREATE POLICY "View promotion recipes" ON public.promotion_recipes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage promotion recipes" ON public.promotion_recipes;
CREATE POLICY "Manage promotion recipes" ON public.promotion_recipes FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP TRIGGER IF EXISTS update_promotions_updated_at ON public.promotions;
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.combo_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL DEFAULT 'bundle',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  free_quantity INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.combo_promotion_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_promotion_id UUID NOT NULL REFERENCES public.combo_promotions(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  is_free_item BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.combo_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_promotion_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View active combos" ON public.combo_promotions;
CREATE POLICY "View active combos" ON public.combo_promotions FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Manage combos" ON public.combo_promotions;
CREATE POLICY "Manage combos" ON public.combo_promotions FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP POLICY IF EXISTS "View combo items" ON public.combo_promotion_items;
CREATE POLICY "View combo items" ON public.combo_promotion_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage combo items" ON public.combo_promotion_items;
CREATE POLICY "Manage combo items" ON public.combo_promotion_items FOR ALL USING (public.get_current_user_role() IN ('admin','manager')) WITH CHECK (public.get_current_user_role() IN ('admin','manager'));
DROP TRIGGER IF EXISTS update_combo_promotions_updated_at ON public.combo_promotions;
CREATE TRIGGER update_combo_promotions_updated_at BEFORE UPDATE ON public.combo_promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_shifts_user_id_status ON public.shifts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id_created_at ON public.sales(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method_created_at ON public.sales(payment_method, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_outs_user_id_created_at ON public.cash_outs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_recipes_category_is_active ON public.recipes(category, is_active);

INSERT INTO public.users (id, username, full_name, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin', 'System Administrator', 'admin', true)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_outs TO authenticated;
GRANT ALL ON public.cash_outs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_modifiers TO authenticated;
GRANT ALL ON public.recipe_modifiers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_sizes TO authenticated;
GRANT ALL ON public.recipe_sizes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT ON public.units TO anon;
GRANT ALL ON public.units TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_transactions TO authenticated;
GRANT ALL ON public.customer_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_rewards TO authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_events TO authenticated;
GRANT ALL ON public.loyalty_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_redemptions TO authenticated;
GRANT ALL ON public.loyalty_redemptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_counts TO authenticated;
GRANT ALL ON public.inventory_counts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_count_items TO authenticated;
GRANT ALL ON public.inventory_count_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restock_history TO authenticated;
GRANT ALL ON public.restock_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_recipes TO authenticated;
GRANT ALL ON public.promotion_recipes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_promotions TO authenticated;
GRANT ALL ON public.combo_promotions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_promotion_items TO authenticated;
GRANT ALL ON public.combo_promotion_items TO service_role;
