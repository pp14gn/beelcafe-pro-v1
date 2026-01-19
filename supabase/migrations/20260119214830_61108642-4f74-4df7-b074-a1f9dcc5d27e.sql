-- Add DELETE policy for inventory_items to allow admins to delete items
CREATE POLICY "Admins can delete inventory items"
ON public.inventory_items
FOR DELETE
USING (get_current_user_role() = 'admin');