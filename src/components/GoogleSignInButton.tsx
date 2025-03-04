import React from 'react';
import {TouchableOpacity, Text, StyleSheet, Alert, Platform} from 'react-native';
import {theme} from '../theme';
import {supabase} from '../lib/supabase';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/types';

// The client ID that matches your Supabase OAuth configuration
const IOS_CLIENT_ID = '53562527674-mifkcvp4n5clto9oqmsb947iep3hvmn1.apps.googleusercontent.com';

GoogleSignin.configure({
  iosClientId: IOS_CLIENT_ID,
});

type Props = {
  onSignInComplete?: () => void;
  loading?: boolean;
};

export default function GoogleSignInButton({onSignInComplete, loading}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  async function handleGoogleSignIn() {
    try {
      console.log('=== Starting Google Auth ===');
      
      // Sign out from any previous sessions to ensure clean state
      await GoogleSignin.signOut();
      await supabase.auth.signOut();
      
      // Check Play Services (this is a no-op on iOS)
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      console.log('Starting Google Sign In...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign In response:', JSON.stringify(userInfo));

      // Get tokens
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

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, partner_id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, go to NameSetup
        console.log('No profile found, navigating to NameSetup');
        const fullName = user.user_metadata.full_name || user.user_metadata.name || '';
        const firstName = fullName.split(' ')[0];
        navigation.navigate('NameSetup', {
          initialName: firstName
        });
      } else if (profile?.partner_id) {
        // Profile exists and has partner, auth context will handle main navigation
        console.log('Profile with partner found, letting auth context handle navigation');
      } else {
        // Profile exists but no partner, go to NameSetup to complete profile
        console.log('Profile without partner found, navigating to NameSetup');
        const fullName = user.user_metadata.full_name || user.user_metadata.name || '';
        const firstName = fullName.split(' ')[0];
        navigation.navigate('NameSetup', {
          initialName: profile?.name || firstName
        });
      }
      
    } catch (error: any) {
      console.error('=== Google Auth Error ===');
      console.error('Detailed error:', error);
      
      // Sign out from both services to clean up state
      try {
        await GoogleSignin.signOut();
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }

      Alert.alert(
        'Authentication Error',
        'Unable to sign in with Google. Please try again.'
      );
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleGoogleSignIn}
      disabled={loading}>
      <Text style={styles.buttonText}>
        {loading ? 'Signing in...' : 'Continue with Google'}
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