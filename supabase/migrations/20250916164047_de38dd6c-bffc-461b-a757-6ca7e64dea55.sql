-- Fix security vulnerability: Restrict recipe ingredients access to authenticated users only
-- Remove the public access policy and replace with authenticated user access

DROP POLICY IF EXISTS "Everyone can view recipe ingredients" ON public.recipe_ingredients;

-- Create new policy that restricts access to authenticated users only
CREATE POLICY "Authenticated users can view recipe ingredients" 
ON public.recipe_ingredients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);