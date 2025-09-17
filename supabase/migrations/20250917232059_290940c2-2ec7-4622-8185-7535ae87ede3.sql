-- Add delete policy for users table
CREATE POLICY "Admins and managers can delete users" 
ON public.users 
FOR DELETE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));