-- Drop the existing foreign key constraint
ALTER TABLE public.inventory_count_items
DROP CONSTRAINT inventory_count_items_inventory_item_id_fkey;

-- Re-add it with ON DELETE CASCADE
ALTER TABLE public.inventory_count_items
ADD CONSTRAINT inventory_count_items_inventory_item_id_fkey
FOREIGN KEY (inventory_item_id)
REFERENCES public.inventory_items(id)
ON DELETE CASCADE;