
-- Add photo_url column to recipes table
ALTER TABLE public.recipes ADD COLUMN photo_url text;

-- Create storage bucket for recipe photos
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-photos', 'recipe-photos', true);

-- Allow authenticated users to upload recipe photos
CREATE POLICY "Authenticated users can upload recipe photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-photos' AND auth.uid() IS NOT NULL);

-- Allow anyone to view recipe photos (public bucket)
CREATE POLICY "Anyone can view recipe photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-photos');

-- Allow authenticated users to update their recipe photos
CREATE POLICY "Authenticated users can update recipe photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-photos' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete recipe photos
CREATE POLICY "Authenticated users can delete recipe photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'recipe-photos' AND auth.uid() IS NOT NULL);
