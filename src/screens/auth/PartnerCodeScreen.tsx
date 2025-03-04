import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { theme } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'PartnerCode'>;

export default function PartnerCodeScreen({ navigation }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('name, partner_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      generatePartnerCode();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function generatePartnerCode() {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          partner_code: code 
        });

      if (error) throw error;
      setMyCode(code);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function linkWithPartner() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      // Get current user's profile
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();
        
      if (myProfileError) throw myProfileError;

      // Find partner profile using the entered code (Partner A)
      const { data: partnerProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, name, partner_name, partner_code')
        .eq('partner_code', partnerCode)
        .single();

      if (findError || !partnerProfile) throw new Error('Invalid partner code');

      console.log('Found partner profile:', partnerProfile);

      // Update Partner A's profile with Partner B's info
      const { error: updatePartnerError } = await supabase
        .from('profiles')
        .update({ 
          partner_id: user.id,  // Set Partner B's ID as Partner A's partner_id
          partner_name: myProfile.name  // Set Partner B's name as Partner A's partner_name
        })
        .eq('id', partnerProfile.id);

      if (updatePartnerError) throw updatePartnerError;

      // Update current user's profile (Partner B) with Partner A's info
      // We no longer clear the partner_code since we want both partners to see it
      const { error: updateMyError } = await supabase
        .from('profiles')
        .update({ 
          partner_id: partnerProfile.id,  // Set Partner A's ID as Partner B's partner_id
          partner_name: partnerProfile.name  // Set Partner A's name as Partner B's partner_name
        })
        .eq('id', user.id);

      if (updateMyError) throw updateMyError;

      Alert.alert(
        'Success', 
        `Successfully linked with ${partnerProfile.name}!`,
        [{ 
          text: 'OK', 
          onPress: () => navigation.navigate('MainTabs') 
        }]
      );
    } catch (error: any) {
      console.error('Error linking with partner:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/priority.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Partner Code</Text>
        <Text style={styles.subtitle}>
          Hi {profile?.name}, let's connect with {profile?.partner_name}
        </Text>

        {myCode && (
          <View style={styles.codeDisplayContainer}>
            <Text style={styles.label}>Your Partner Code:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{myCode}</Text>
            </View>
            <Text style={styles.instruction}>
              Share this code with {profile?.partner_name}
            </Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter {profile?.partner_name}'s Code:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            value={partnerCode}
            onChangeText={setPartnerCode}
            autoCapitalize="characters"
            placeholderTextColor={theme.colors.input.placeholder}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={linkWithPartner}
          disabled={loading || !partnerCode}>
          <Text style={styles.buttonText}>
            {loading ? "Linking..." : `Link with ${profile?.partner_name}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    width: 160,
    height: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: 80,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  codeDisplayContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codeBox: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    marginVertical: 10,
  },
  codeText: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xlarge,
    color: theme.colors.primary,
    letterSpacing: 5,
  },
  instruction: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  input: {
    height: 50,
    backgroundColor: theme.colors.input.background,
    borderWidth: 1,
    borderColor: theme.colors.input.border,
    borderRadius: 8,
    padding: 15,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.input.text,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
}); 