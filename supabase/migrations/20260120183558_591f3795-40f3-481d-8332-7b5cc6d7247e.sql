-- Create recipe_sizes table to store size variations for beverages
CREATE TABLE public.recipe_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Small', 'Medium', 'Large'
  price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0, -- Added to base_price
  ingredient_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1, -- Multiplier for ingredient quantities
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies for recipe_sizes
CREATE POLICY "Authenticated users can view active recipe sizes" 
ON public.recipe_sizes 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (is_active = true OR get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text])));

CREATE POLICY "Managers and admins can manage recipe sizes" 
ON public.recipe_sizes 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

-- Add trigger for updated_at
CREATE TRIGGER update_recipe_sizes_updated_at
BEFORE UPDATE ON public.recipe_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add has_sizes column to recipes table to indicate if a recipe supports sizes
ALTER TABLE public.recipes ADD COLUMN has_sizes BOOLEAN NOT NULL DEFAULT false;