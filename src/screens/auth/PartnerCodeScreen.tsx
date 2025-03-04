import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import CustomButton from '../../components/CustomButton';
import { generateRandomCode } from '../../utils/codeGenerator';
import { AuthContext } from '../../contexts/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'PartnerCode'>;

export default function PartnerCodeScreen({ navigation }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const { refreshProfile } = useContext(AuthContext);

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
      setCodeGenerated(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function linkWithPartner() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('Starting partner connection process...');

      // Get current user's profile (Partner B)
      const { data: partnerB, error: myProfileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .single();
      
      if (myProfileError) {
        console.error('Error getting Partner B profile:', myProfileError);
        throw myProfileError;
      }
      console.log('Partner B profile:', partnerB);

      // Find partner profile using the code (Partner A)
      const { data: partnerA, error: findError } = await supabase
        .from('profiles')
        .select('id, name, partner_code')
        .eq('partner_code', partnerCode.trim())
        .single();

      if (findError || !partnerA) {
        console.error('Error finding Partner A:', findError);
        throw new Error('Invalid partner code');
      }
      console.log('Found Partner A profile:', partnerA);

      // Use the stored procedure to connect partners
      console.log('Calling connect_partners function...');
      const { data: result, error: connectError } = await supabase.rpc('connect_partners', {
        p_partner_a_id: partnerA.id,
        p_partner_a_name: partnerA.name,
        p_partner_b_id: partnerB.id,
        p_partner_b_name: partnerB.name,
        p_partner_code: partnerCode.trim()
      });

      console.log('Connect partners result:', result);
      
      if (connectError) {
        console.error('Error connecting partners:', connectError);
        throw connectError;
      }
      
      if (!result.success) {
        console.error('Connect partners failed:', result.message);
        throw new Error(result.message);
      }

      // Force refresh the profile to get the updated data
      if (refreshProfile) {
        console.log('Refreshing profile after connection...');
        await refreshProfile();
      }

      Alert.alert(
        'Success!', 
        `Connected with ${partnerA.name}!`,
        [{ 
          text: 'Continue', 
          onPress: () => {
            // Force refresh of the profile one more time before navigation
            if (refreshProfile) {
              refreshProfile().then(() => {
                navigation.navigate('MainTabs');
              });
            } else {
              navigation.navigate('MainTabs');
            }
          }
        }]
      );

    } catch (error: any) {
      console.error('Error in linkWithPartner:', error);
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