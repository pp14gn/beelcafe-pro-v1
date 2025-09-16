import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          // Check if this is the admin user and create admin profile
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email === 'admin@beelcafe.com') {
            const adminProfile = {
              id: userId,
              username: 'admin',
              full_name: 'System Administrator',
              role: 'admin' as const,
              email: 'admin@beelcafe.com',
              is_active: true,
            };

            const { error: insertError } = await supabase
              .from('users')
              .insert([adminProfile]);

            if (!insertError) {
              setUserProfile(adminProfile);
              return;
            }
          }
          
          console.log('User profile not found, this is normal for new users');
          setUserProfile(null);
          return;
        }
        
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Handle admin login with hardcoded credentials by creating a real Supabase user
      if ((email === 'admin@coffeepos.com' || email === 'admin') && password === 'admin') {
        try {
          // Try to sign up the admin user first (in case it doesn't exist)
          await supabase.auth.signUp({
            email: 'admin@beelcafe.com',
            password: 'admin123!',
          });
        } catch (error) {
          // User might already exist, that's fine
        }

        // Sign in with the admin credentials
        const { error } = await supabase.auth.signInWithPassword({
          email: 'admin@beelcafe.com',
          password: 'admin123!',
        });
        
        return { error };
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

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            username: userData.username || '',
            full_name: userData.full_name || '',
            role: userData.role || 'cashier',
            is_active: true,
          },
        ]);

      return { error: profileError };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
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