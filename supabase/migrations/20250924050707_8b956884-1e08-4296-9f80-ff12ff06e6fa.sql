-- Remove permissive policies that allow public access to business data
DROP POLICY IF EXISTS "Everyone can view active recipes" ON public.recipes;
DROP POLICY IF EXISTS "Everyone can view active recipe modifiers" ON public.recipe_modifiers;

-- Create secure policies that require authentication for recipes
CREATE POLICY "Authenticated users can view active recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (is_active = true OR get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text])));

-- Create secure policies that require authentication for recipe modifiers  
CREATE POLICY "Authenticated users can view active recipe modifiers" 
ON public.recipe_modifiers 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (is_active = true OR get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text])));