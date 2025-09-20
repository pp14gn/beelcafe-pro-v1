-- Create categories table for recipes and inventory
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('recipe', 'inventory')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage categories
CREATE POLICY "Everyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update categories" 
ON public.categories 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, type) VALUES 
('Beverages', 'recipe'),
('Food', 'recipe'),
('Desserts', 'recipe'),
('Snacks', 'recipe'),
('Coffee Beans', 'inventory'),
('Dairy', 'inventory'),
('Syrups', 'inventory'),
('Supplies', 'inventory');