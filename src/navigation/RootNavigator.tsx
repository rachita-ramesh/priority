import React from 'react';
import {NavigationContainer, LinkingOptions} from '@react-navigation/native';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {useAuth} from '../hooks/useAuth';
import {supabase} from '../lib/supabase';
import type {Session, AuthChangeEvent} from '@supabase/supabase-js';

const linking: LinkingOptions<any> = {
  prefixes: ['priority://', 'https://vgudsmczrmdlwreevdrs.supabase.co'],
  config: {
    screens: {
      MainTabs: 'main',
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
          NameSetup: 'namesetup',
          PartnerCode: 'partnercode',
        }
      }
    }
  },
  subscribe(listener) {
    const unsubscribe = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Deep link auth state change:', { event, session });
      if (event === 'SIGNED_IN') {
        listener('namesetup');
      }
    });

    return () => {
      unsubscribe.data.subscription.unsubscribe();
    };
  },
};

export const RootNavigator = () => {
  const {isAuthenticated, loading, profile} = useAuth();

  console.log('RootNavigator state:', { isAuthenticated, loading, profile });

  return (
    <NavigationContainer 
      linking={linking}
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
      }}>
      {isAuthenticated && profile ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}; 