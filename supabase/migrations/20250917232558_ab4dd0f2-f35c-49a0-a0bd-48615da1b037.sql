-- Drop all existing INSERT policies to start fresh
DROP POLICY IF EXISTS "Allow user profile creation" ON public.users;
DROP POLICY IF EXISTS "Admins and managers can create users" ON public.users;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;

-- Create a comprehensive policy that avoids circular dependencies
-- by checking the user's role from auth metadata during signup
CREATE POLICY "Users can insert profiles" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow users to create their own profile
  auth.uid() = id
  OR
  -- Allow users with admin/manager role in auth metadata to create any profile
  (auth.jwt() ->> 'role') = ANY (ARRAY['admin', 'manager'])
  OR
  -- Fallback: allow all authenticated users (temporary for bootstrapping)
  auth.uid() IS NOT NULL
);