import React, {useState, useEffect} from 'react';
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
  Clipboard,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/types';
import {theme} from '../../theme';
import {CommonActions} from '@react-navigation/native';

type Props = NativeStackScreenProps<AuthStackParamList, 'NameSetup'>;

type FlowStep = 'selection' | 'partner_a' | 'partner_b';

// Generate a random code of specified length
function generateRandomCode(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export default function NameSetupScreen({navigation, route}: Props) {
  const initialName = route.params?.initialName;
  const [name, setName] = useState(initialName || '');
  const [partnerName, setPartnerName] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>('selection');
  const [checkingPartner, setCheckingPartner] = useState(true);

  useEffect(() => {
    checkExistingPartner();
  }, []);

  async function checkExistingPartner() {
    try {
      setCheckingPartner(true);
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if this user has a profile
      const {data: profiles, error: profileError} = await supabase
        .from('profiles')
        .select('id, name, partner_name, partner_id, partner_code')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // No profile - show selection screen
        setCheckingPartner(false);
        return;
      }

      if (profileError) {
        console.error('Error checking profiles:', profileError);
        setCheckingPartner(false);
        return;
      }

      if (profiles.partner_id) {
        // Already connected - refresh auth session to trigger main app navigation
        const {data: {session}} = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.setSession(session);
        }
        return;
      }

      // Has a profile but no partner
      setName(profiles.name || name);
      setPartnerName(profiles.partner_name || '');
      setCheckingPartner(false);

    } catch (error) {
      console.error('Error in checkExistingPartner:', error);
      setCheckingPartner(false);
    }
  }

  async function handleSubmit() {
    if (flowStep === 'partner_a' && (!name.trim() || !partnerName.trim())) {
      Alert.alert('Error', 'Please enter both names');
      return;
    }

    if (flowStep === 'partner_b' && !partnerCode.trim()) {
      Alert.alert('Error', 'Please enter the partner code');
      return;
    }

    try {
      setLoading(true);
      const {data: {user}} = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      if (flowStep === 'partner_a') {
        // Generate a unique partner code
        const partnerCode = generateRandomCode(6);
        
        // Create/update profile with the partner code
        const {error: updateError} = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: name.trim(),
            partner_name: partnerName.trim(),
            partner_code: partnerCode
          });

        if (updateError) throw updateError;
        
        Alert.alert(
          'Share This Code',
          `Your partner code is:\n\n${partnerCode}\n\nShare this code with ${partnerName} to connect your accounts.`,
          [
            {
              text: 'Copy Code',
              onPress: async () => {
                try {
                  Clipboard.setString(partnerCode);
                  // Navigate to main app immediately
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'MainTabs',
                        },
                      ],
                    })
                  );
                } catch (error) {
                  console.error('Navigation error:', error);
                  // Fallback to Login if direct navigation fails
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'Login'}],
                  });
                }
              }
            }
          ]
        );
      } else {
        // Find partner profile using the code
        const {data: partnerProfile, error: findError} = await supabase
          .from('profiles')
          .select('id, name')
          .eq('partner_code', partnerCode.trim())
          .single();

        if (findError || !partnerProfile) {
          Alert.alert('Error', 'Invalid partner code. Please check and try again.');
          return;
        }

        // First update user's profile
        const {error: profileError} = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: name.trim(),
            partner_id: partnerProfile.id,
            partner_name: partnerProfile.name
          });

        if (profileError) throw profileError;

        // Then update partner's profile
        const {error: partnerUpdateError} = await supabase
          .from('profiles')
          .update({ 
            partner_id: user.id,
            partner_name: name.trim()
          })
          .eq('id', partnerProfile.id);

        if (partnerUpdateError) throw partnerUpdateError;

        // Verify both profiles are linked
        const { data: verifyProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('id, partner_id, name')
          .eq('id', user.id)
          .single();

        if (verifyError || !verifyProfile.partner_id) {
          throw new Error('Failed to verify profile connection');
        }

        Alert.alert(
          'Success!',
          `Connected with ${partnerProfile.name}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  })
                );
              }
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingPartner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
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
        
        {flowStep === 'selection' ? (
          <>
            <Text style={styles.title}>Connect with Partner</Text>
            <Text style={styles.subtitle}>Do you have a partner code?</Text>

            <TouchableOpacity 
              style={styles.button}
              onPress={() => setFlowStep('partner_b')}>
              <Text style={styles.buttonText}>Yes, I have a code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setFlowStep('partner_a')}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                No, generate a new code
              </Text>
            </TouchableOpacity>
          </>
        ) : flowStep === 'partner_a' ? (
          <>
            <Text style={styles.title}>Partner Names</Text>
            <Text style={styles.subtitle}>Let's get to know you both</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={theme.colors.input.placeholder}
                autoFocus={!name}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Partner's Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your partner's name"
                value={partnerName}
                onChangeText={setPartnerName}
                placeholderTextColor={theme.colors.input.placeholder}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "Saving..." : "Generate Partner Code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setFlowStep('selection')}
              disabled={loading}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Back
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter Partner Code</Text>
            <Text style={styles.subtitle}>Connect with your partner's account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={theme.colors.input.placeholder}
                autoFocus={!name}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Partner Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter partner code"
                value={partnerCode}
                onChangeText={setPartnerCode}
                placeholderTextColor={theme.colors.input.placeholder}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "Connecting..." : "Connect Accounts"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setFlowStep('selection')}
              disabled={loading}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Back
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginBottom: 8,
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
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
}); 