-- Drop existing insert policies one by one
DROP POLICY IF EXISTS "Admins and managers can create users" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;

-- Create a single comprehensive insert policy that allows both cases
CREATE POLICY "Allow user profile creation" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow users to create their own profile during signup
  auth.uid() = id 
  OR 
  -- Allow existing admins and managers to create profiles for other users
  (
    auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role = ANY (ARRAY['admin'::text, 'manager'::text])
      AND is_active = true
    )
  )
);