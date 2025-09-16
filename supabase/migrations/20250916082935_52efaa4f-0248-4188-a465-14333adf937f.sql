-- Add RLS policy to allow users to create their own profile
CREATE POLICY "Users can create their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);