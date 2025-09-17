-- Check and drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop admin policy if it exists
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins and managers can create users') THEN
        DROP POLICY "Admins and managers can create users" ON public.users;
    END IF;
    
    -- Check for other insert policies and drop them
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND cmd = 'INSERT' AND policyname != 'Allow user profile creation') THEN
        -- Get the actual policy name
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND cmd = 'INSERT' AND policyname != 'Allow user profile creation')
        LOOP
            EXECUTE 'DROP POLICY "' || r.policyname || '" ON public.users';
        END LOOP;
    END IF;
END $$;

-- Create a single comprehensive insert policy
CREATE POLICY "Allow user profile creation" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow users to create their own profile during signup
  auth.uid() = id 
  OR 
  -- Allow admins and managers to create profiles for other users
  EXISTS (
    SELECT 1 FROM auth.users au
    JOIN public.users u ON au.id = u.id
    WHERE au.id = auth.uid() 
    AND u.role = ANY (ARRAY['admin'::text, 'manager'::text])
  )
);