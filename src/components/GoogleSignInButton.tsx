import React, {useState} from 'react';
import {TouchableOpacity, Text, StyleSheet, Alert, Platform} from 'react-native';
import {theme} from '../theme';
import {supabase} from '../lib/supabase';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {useNavigation, CommonActions} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/types';

// The client ID that matches your Supabase OAuth configuration
const IOS_CLIENT_ID = '53562527674-mifkcvp4n5clto9oqmsb947iep3hvmn1.apps.googleusercontent.com';

GoogleSignin.configure({
  iosClientId: IOS_CLIENT_ID,
  // Make sure to clear any previous configuration
  offlineAccess: false,
  forceCodeForRefreshToken: false,
});

type Props = {
  onSignInComplete?: () => void;
  loading?: boolean;
};

export default function GoogleSignInButton({onSignInComplete, loading: externalLoading}: Props) {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      console.log('=== Starting Google Auth ===');
      
      // Sign out from any previous sessions to ensure clean state
      try {
        await GoogleSignin.signOut();
        console.log('Successfully signed out from Google');
      } catch (signOutError) {
        console.log('Google sign out error (non-critical):', signOutError);
        // Continue anyway as this is just a precaution
      }
      
      try {
        await supabase.auth.signOut();
        console.log('Successfully signed out from Supabase');
      } catch (signOutError) {
        console.log('Supabase sign out error (non-critical):', signOutError);
        // Continue anyway as this is just a precaution
      }
      
      // Check Play Services (this is a no-op on iOS)
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      console.log('Starting Google Sign In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign In successful, user info received:', userInfo);
      
      // Get tokens
      console.log('Getting Google tokens...');
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('Attempting to sign in with Supabase...');
      
      // Sign in to Supabase using the Google ID token
      const { data: { user }, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (signInError) {
        console.error('Supabase sign in error:', signInError);
        throw signInError;
      }

      if (!user) {
        throw new Error('No user returned from Supabase');
      }

      console.log('Successfully signed in with Google');
      
      if (onSignInComplete) {
        onSignInComplete();
      }
      
    } catch (error: any) {
      console.error('=== Google Auth Error ===');
      console.error('Detailed error:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Unable to sign in with Google. Please try again.';
      
      if (error.message?.includes('cancelled')) {
        errorMessage = 'Sign in was cancelled. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('token')) {
        errorMessage = 'Authentication token error. Please try signing in again.';
      }
      
      // Sign out from both services to clean up state
      try {
        await GoogleSignin.signOut();
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }

      Alert.alert(
        'Authentication Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }

  const isLoading = loading || externalLoading;

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={handleGoogleSignIn}
      disabled={isLoading}>
      <Text style={styles.buttonText}>
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.surface,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
}); 