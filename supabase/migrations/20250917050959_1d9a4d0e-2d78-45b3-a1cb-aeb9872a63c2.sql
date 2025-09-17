-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-photos', 'inventory-photos', true);

-- Add photo field to inventory_items table
ALTER TABLE public.inventory_items ADD COLUMN photo_url TEXT;

-- Create storage policies for inventory photos
CREATE POLICY "Anyone can view inventory photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Managers and admins can upload inventory photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

CREATE POLICY "Managers and admins can update inventory photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'inventory-photos' AND auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

CREATE POLICY "Managers and admins can delete inventory photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'inventory-photos' AND auth.uid() IS NOT NULL AND get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));