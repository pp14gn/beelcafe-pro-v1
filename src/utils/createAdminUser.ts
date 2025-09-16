import { supabase } from '@/lib/supabase';

export const createAdminUser = async () => {
  try {
    // Create the admin user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@coffeepos.com',
      password: 'admin',
    });

    if (authError) {
      console.error('Error creating admin auth user:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth user' };
    }

    // Create the admin profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          username: 'admin',
          full_name: 'System Administrator',
          role: 'admin',
          is_active: true,
        },
      ]);

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      return { success: false, error: profileError.message };
    }

    return { success: true, message: 'Admin user created successfully' };
  } catch (error) {
    console.error('Unexpected error creating admin user:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};