-- Add usage unit and conversion factor to inventory items
-- This allows tracking bulk purchases (e.g., kg) while using smaller units in recipes (e.g., g)

ALTER TABLE public.inventory_items 
ADD COLUMN usage_unit text,
ADD COLUMN usage_per_stock_unit numeric DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.inventory_items.usage_unit IS 'The smaller unit used in recipes (e.g., grams when stock is in kg)';
COMMENT ON COLUMN public.inventory_items.usage_per_stock_unit IS 'How many usage units per stock unit (e.g., 1000 for kg to g)';