-- Create a system admin user
INSERT INTO public.users (id, username, full_name, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  'System Administrator',
  'admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;