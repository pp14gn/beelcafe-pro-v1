import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'manager' | 'cashier' | 'admin';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHardcodedAdmin, setIsHardcodedAdmin] = useState(false);

  useEffect(() => {
    // Get initial session with error handling
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth session error:', error);
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // Don't override hardcoded admin user
        if (isHardcodedAdmin) {
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isHardcodedAdmin]);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Get current user for creating profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating default profile for new user');
          try {
            const { error: createError } = await supabase
              .from('users')
              .insert([
                {
                  id: userId,
                  username: currentUser?.email?.split('@')[0] || 'user',
                  full_name: currentUser?.email || 'User',
                  role: 'cashier',
                  is_active: true,
                },
              ]);

            if (createError) {
              console.error('Error creating user profile:', createError);
              setUserProfile(null);
              return;
            }

            // Fetch the newly created profile
            const { data: newProfile, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            if (fetchError) {
              console.error('Error fetching new user profile:', fetchError);
              setUserProfile(null);
              return;
            }

            setUserProfile(newProfile as UserProfile);
            return;
          } catch (createError) {
            console.error('Unexpected error creating user profile:', createError);
            setUserProfile(null);
            return;
          }
        }
        
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
        return;
      }

      setUserProfile(data as UserProfile);
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Handle admin login with hardcoded credentials as fallback
      if ((email === 'admin@coffeepos.com' || email === 'admin') && password === 'admin') {
        // Create a mock user for admin
        const adminUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@coffeepos.com',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          aud: '',
          confirmation_sent_at: '',
        };
        
        const adminProfile = {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'admin',
          full_name: 'System Administrator',
          role: 'admin' as const,
          is_active: true,
        };

        setUser(adminUser as any);
        setUserProfile(adminProfile);
        setIsHardcodedAdmin(true);
        setLoading(false);
        return { error: null };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) {
        return { error };
      }

      // Create user profile (use upsert to handle existing users)
      const { error: profileError } = await supabase
        .from('users')
        .upsert(
          {
            id: data.user.id,
            username: userData.username || '',
            full_name: userData.full_name || '',
            role: userData.role || 'cashier',
            is_active: true,
          },
          {
            onConflict: 'id'
          }
        );

      return { error: profileError };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    setIsHardcodedAdmin(false);
    setUser(null);
    setUserProfile(null);
    await supabase.auth.signOut();
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};