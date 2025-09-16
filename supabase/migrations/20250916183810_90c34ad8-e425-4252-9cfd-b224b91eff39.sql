-- First, drop existing data to avoid conflicts
DELETE FROM recipe_modifiers;

-- Add new columns for inventory item relationship
ALTER TABLE recipe_modifiers 
ADD COLUMN inventory_item_id uuid,
ADD COLUMN quantity numeric DEFAULT 1;

-- Remove the old name and price columns
ALTER TABLE recipe_modifiers 
DROP COLUMN name,
DROP COLUMN price;

-- Make inventory_item_id required and add foreign key constraint
ALTER TABLE recipe_modifiers 
ALTER COLUMN inventory_item_id SET NOT NULL,
ADD CONSTRAINT fk_recipe_modifiers_inventory_item 
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate modifier-inventory combinations
ALTER TABLE recipe_modifiers 
ADD CONSTRAINT unique_recipe_inventory_modifier 
  UNIQUE (recipe_id, inventory_item_id);