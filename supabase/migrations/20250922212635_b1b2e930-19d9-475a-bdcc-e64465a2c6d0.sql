-- Create inventory_counts table for tracking inventory count sessions
CREATE TABLE public.inventory_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL DEFAULT 0,
  discrepancies_count INTEGER NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create inventory_count_items table for individual item counts
CREATE TABLE public.inventory_count_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  system_count NUMERIC NOT NULL DEFAULT 0,
  actual_count NUMERIC NOT NULL DEFAULT 0,
  discrepancy NUMERIC GENERATED ALWAYS AS (actual_count - system_count) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_counts
CREATE POLICY "Managers and admins can view all inventory counts" 
ON public.inventory_counts 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

CREATE POLICY "Users can create inventory counts" 
ON public.inventory_counts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can update inventory counts" 
ON public.inventory_counts 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

-- Create policies for inventory_count_items  
CREATE POLICY "Managers and admins can view inventory count items" 
ON public.inventory_count_items 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

CREATE POLICY "Users can create inventory count items" 
ON public.inventory_count_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.inventory_counts 
  WHERE id = count_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their inventory count items" 
ON public.inventory_count_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.inventory_counts 
  WHERE id = count_id AND user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_counts_updated_at
BEFORE UPDATE ON public.inventory_counts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();