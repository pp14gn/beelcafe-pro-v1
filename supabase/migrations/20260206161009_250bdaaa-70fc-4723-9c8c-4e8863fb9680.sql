
-- Add inventory_item_id to recipe_sizes to link sizes to cup/container items
ALTER TABLE public.recipe_sizes 
ADD COLUMN inventory_item_id uuid REFERENCES public.inventory_items(id);
