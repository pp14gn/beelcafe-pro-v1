-- Create enum for combo promotion types
DO $$ BEGIN
  CREATE TYPE public.combo_promotion_type AS ENUM ('buy_x_get_y', 'bundle', 'quantity_discount');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create combo promotions table
CREATE TABLE public.combo_promotions (
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

-- Create combo promotion items table (items in the combo)
CREATE TABLE public.combo_promotion_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_promotion_id UUID NOT NULL REFERENCES public.combo_promotions(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  is_free_item BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combo_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_promotion_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for combo_promotions
CREATE POLICY "Anyone can view active combo promotions" 
ON public.combo_promotions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins and managers can manage combo promotions" 
ON public.combo_promotions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = ANY (ARRAY['admin'::text, 'manager'::text])
));

-- RLS Policies for combo_promotion_items
CREATE POLICY "Anyone can view combo promotion items" 
ON public.combo_promotion_items 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and managers can manage combo promotion items" 
ON public.combo_promotion_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.role = ANY (ARRAY['admin'::text, 'manager'::text])
));

-- Add updated_at trigger
CREATE TRIGGER update_combo_promotions_updated_at
BEFORE UPDATE ON public.combo_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();