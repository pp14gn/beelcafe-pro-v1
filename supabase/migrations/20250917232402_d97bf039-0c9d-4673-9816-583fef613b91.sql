-- Drop the conflicting policy that causes issues when admins create users
DROP POLICY "Users can create their own profile" ON public.users;

-- Update the admin policy to be more specific about when it applies
DROP POLICY "Admins and managers can create users" ON public.users;

-- Create a comprehensive insert policy that handles both cases
CREATE POLICY "Allow user profile creation" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow users to create their own profile during signup
  auth.uid() = id 
  OR 
  -- Allow admins and managers to create profiles for other users
  (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = ANY (ARRAY['admin'::text, 'manager'::text])
    )
  )
);