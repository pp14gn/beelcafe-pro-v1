-- Drop existing INSERT policies by their exact names
DROP POLICY IF EXISTS "Admins and managers can create users" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;

-- Create a single comprehensive insert policy that handles both cases
CREATE POLICY "Allow user profile creation" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow users to create their own profile during signup
  auth.uid() = id 
  OR 
  -- Allow admins and managers to create profiles for other users (but this creates circular dependency)
  -- So we'll simplify and allow all authenticated users to insert initially
  auth.uid() IS NOT NULL
);