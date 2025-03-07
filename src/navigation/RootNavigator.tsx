import React from 'react';
import {NavigationContainer, LinkingOptions} from '@react-navigation/native';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {useAuth} from '../hooks/useAuth';
import {supabase} from '../lib/supabase';
import type {Session, AuthChangeEvent} from '@supabase/supabase-js';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {theme} from '../theme';
import {Linking} from 'react-native';

const linking: LinkingOptions<any> = {
  prefixes: ['priority://', 'https://vgudsmczrmdlwreevdrs.supabase.co'],
  config: {
    screens: {
      MainTabs: 'main',
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
          NameSetup: {
            path: 'namesetup',
            screens: {
              callback: 'auth/callback'
            }
          },
          PartnerCode: 'partnercode',
        }
      }
    }
  },
  async getInitialURL() {
    // First, check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
  },
  subscribe(listener) {
    const unsubscribe = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Deep link auth state change:', { event, session });
      
      if (event === 'SIGNED_IN') {
        // Handle successful sign in after email verification
        listener('priority://auth/callback');
      }
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      unsubscribe.data.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  },
};

export const RootNavigator = () => {
  const {isAuthenticated, loading, profile, session} = useAuth();

  console.log('RootNavigator state:', { isAuthenticated, loading, profile });

  // Show a loading indicator while determining auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer 
      linking={linking}
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
      }}>
      {(() => {
        // Not authenticated - show auth flow
        if (!isAuthenticated) {
          return <AuthNavigator />;
        }
        
        // Authenticated but no profile - show name setup
        if (isAuthenticated && !profile) {
          return <AuthNavigator initialRouteName="NameSetup" />;
        }
        
        // Authenticated with profile
        if (isAuthenticated && profile) {
          // If they have a partner_code, they're Partner A - show main app
          if (profile.partner_code) {
            return <MainNavigator />;
          }
          
          // If they don't have a partner_code, they're Partner B - show partner code screen
          if (!profile.partner_id) {
            return <AuthNavigator initialRouteName="PartnerCode" />;
          }
        }
        
        // Fully authenticated with profile and partner - show main app
        return <MainNavigator />;
      })()}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
}); 