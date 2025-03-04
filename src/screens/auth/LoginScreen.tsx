import React, {useState} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/types';
import {theme} from '../../theme';
import GoogleSignInButton from '../../components/GoogleSignInButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      const {error} = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);
    } catch (error: any) {
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
        <Text style={styles.title}>Welcome to Priority</Text>
        <Text style={styles.subtitle}>Relationship goals, literally</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholderTextColor={theme.colors.input.placeholder}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={theme.colors.input.placeholder}
        />
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "Loading..." : "Login"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleSignInButton loading={loading} />

        <TouchableOpacity 
          onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpText}>
            Don't have an account? Sign Up
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
  input: {
    height: 50,
    backgroundColor: theme.colors.input.background,
    borderWidth: 1,
    borderColor: theme.colors.input.border,
    borderRadius: 8,
    marginBottom: 15,
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
  signUpText: {
    marginTop: 20,
    textAlign: 'center',
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
  },
}); 