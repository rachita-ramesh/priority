import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';

export const AuthContext = createContext<{
  session: Session | null;
  isAuthenticated: boolean;
  profile: any | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}>({
  session: null,
  isAuthenticated: false,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session);
      if (session?.user) {
        console.log('User found in session:', session.user);
        fetchProfile(session.user.id);
      } else {
        console.log('No user in session');
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, session });
      
      if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.log('Token refresh failed - signing out');
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      setSession(session);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          console.log('User signed in:', session.user);
          await fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out - clearing state');
        setSession(null);
        setProfile(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      console.log('Fetching profile for user:', userId);
      setError(null);
      setLoading(true);
      
      // Get the complete profile with all fields
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          partner_name,
          partner_id,
          partner_code,
          email,
          created_at
        `)
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No profile found for user - likely a new user');
          setProfile(null);
        } else {
          console.error('Error fetching profile:', error);
          throw error;
        }
      } else {
        console.log('Complete profile data found:', profile);
        // Set the complete profile object
        setProfile(profile);
        console.log('Profile state updated with:', profile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setProfile(null);
      
      // Show an alert for the error
      Alert.alert(
        'Profile Error',
        'There was an error loading your profile. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Sign out to reset the state
              supabase.auth.signOut();
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  // Function to manually refresh the profile
  async function refreshProfile() {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }

  const contextValue = {
    session,
    isAuthenticated: !!session?.user,
    profile,
    loading,
    error,
    refreshProfile,
  };

  console.log('Auth context value:', contextValue);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
} 