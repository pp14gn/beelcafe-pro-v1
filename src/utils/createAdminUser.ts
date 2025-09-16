import { supabase } from '@/integrations/supabase/client';

export const createAdminUser = async () => {
  try {
    console.log('Starting admin user creation...');
    
    // Create the admin user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@coffeepos.com',
      password: 'admin',
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        return { success: true, message: 'Admin user already exists' };
      }
      console.error('Error creating admin auth user:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth user' };
    }

    console.log('Auth user created, creating profile...');

    // Create the admin profile in the users table (with upsert to handle existing)
    const { error: profileError } = await supabase
      .from('users')
      .upsert([
        {
          id: authData.user.id,
          username: 'admin',
          full_name: 'System Administrator',
          role: 'admin',
          is_active: true,
        },
      ], { 
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      // If table doesn't exist, that's ok for now
      if (profileError.message.includes('relation "users" does not exist')) {
        return { success: true, message: 'Admin user created (profile will be created on first login)' };
      }
      return { success: false, error: profileError.message };
    }

    console.log('Admin user created successfully');
    return { success: true, message: 'Admin user created successfully' };
  } catch (error) {
    console.error('Unexpected error creating admin user:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};