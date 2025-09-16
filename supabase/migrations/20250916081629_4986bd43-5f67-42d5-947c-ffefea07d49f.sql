-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shifts table
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table  
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  start_time TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cash_outs table
CREATE TABLE public.cash_outs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  prep_time INTEGER, -- minutes
  servings INTEGER DEFAULT 1,
  instructions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, inventory_item_id)
);

-- Create recipe_modifiers table
CREATE TABLE public.recipe_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_modifiers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_items (managers and admins can manage)
CREATE POLICY "Managers and admins can view all inventory items"
ON public.inventory_items FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can insert inventory items"
ON public.inventory_items FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can update inventory items"
ON public.inventory_items FOR UPDATE
USING (public.get_current_user_role() IN ('admin', 'manager'));

-- Create RLS policies for shifts (users can manage their own shifts)
CREATE POLICY "Users can view their own shifts"
ON public.shifts FOR SELECT
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Users can create their own shifts"
ON public.shifts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shifts"
ON public.shifts FOR UPDATE
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

-- Create RLS policies for sales (users can manage their own sales, managers can view all)
CREATE POLICY "Users can view their own sales, managers can view all"
ON public.sales FOR SELECT
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Users can create their own sales"
ON public.sales FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for orders (users can manage their own orders, managers can view all)
CREATE POLICY "Users can view their own orders, managers can view all"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

-- Create RLS policies for cash_outs (users can manage their own cash outs)
CREATE POLICY "Users can view their own cash outs"
ON public.cash_outs FOR SELECT
USING (auth.uid() = user_id OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Users can create their own cash outs"
ON public.cash_outs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for recipes (everyone can view, managers can manage)
CREATE POLICY "Everyone can view active recipes"
ON public.recipes FOR SELECT
USING (is_active = true OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can manage recipes"
ON public.recipes FOR ALL
USING (public.get_current_user_role() IN ('admin', 'manager'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));

-- Create RLS policies for recipe_ingredients (everyone can view, managers can manage)
CREATE POLICY "Everyone can view recipe ingredients"
ON public.recipe_ingredients FOR SELECT
USING (true);

CREATE POLICY "Managers and admins can manage recipe ingredients"
ON public.recipe_ingredients FOR ALL
USING (public.get_current_user_role() IN ('admin', 'manager'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));

-- Create RLS policies for recipe_modifiers (everyone can view active modifiers, managers can manage)
CREATE POLICY "Everyone can view active recipe modifiers"
ON public.recipe_modifiers FOR SELECT
USING (is_active = true OR public.get_current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can manage recipe modifiers"
ON public.recipe_modifiers FOR ALL
USING (public.get_current_user_role() IN ('admin', 'manager'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'manager'));

-- Add triggers for automatic timestamp updates on all tables
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_outs_updated_at
  BEFORE UPDATE ON public.cash_outs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_shifts_user_id_status ON public.shifts(user_id, status);
CREATE INDEX idx_sales_user_id_created_at ON public.sales(user_id, created_at);
CREATE INDEX idx_sales_payment_method_created_at ON public.sales(payment_method, created_at);
CREATE INDEX idx_orders_user_id_status ON public.orders(user_id, status);
CREATE INDEX idx_cash_outs_user_id_created_at ON public.cash_outs(user_id, created_at);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_recipes_category_is_active ON public.recipes(category, is_active);