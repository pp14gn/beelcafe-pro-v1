-- Create a table for units used in inventory and recipes
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  type TEXT NOT NULL DEFAULT 'general', -- 'weight', 'volume', 'count', 'general'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policies for units
CREATE POLICY "Everyone can view units" 
ON public.units 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert units" 
ON public.units 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update units" 
ON public.units 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete units" 
ON public.units 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default units
INSERT INTO public.units (name, abbreviation, type) VALUES
  ('Kilogram', 'kg', 'weight'),
  ('Gram', 'g', 'weight'),
  ('Pound', 'lb', 'weight'),
  ('Ounce', 'oz', 'weight'),
  ('Liter', 'L', 'volume'),
  ('Milliliter', 'ml', 'volume'),
  ('Cup', 'cup', 'volume'),
  ('Tablespoon', 'tbsp', 'volume'),
  ('Teaspoon', 'tsp', 'volume'),
  ('Piece', 'pc', 'count'),
  ('Dozen', 'dz', 'count'),
  ('Pack', 'pack', 'general'),
  ('Box', 'box', 'general'),
  ('Bag', 'bag', 'general');