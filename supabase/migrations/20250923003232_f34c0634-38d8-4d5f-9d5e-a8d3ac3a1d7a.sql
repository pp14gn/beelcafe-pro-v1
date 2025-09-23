-- Create restock_history table to track all restock operations
CREATE TABLE public.restock_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL,
  restock_order_id TEXT,
  quantity_added NUMERIC NOT NULL,
  cost NUMERIC,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restock_history ENABLE ROW LEVEL SECURITY;

-- Create policies for restock history
CREATE POLICY "Users can create their own restock records" 
ON public.restock_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all restock history" 
ON public.restock_history 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_restock_history_updated_at
BEFORE UPDATE ON public.restock_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();