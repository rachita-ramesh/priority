import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Share,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import {theme} from '../../theme';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/types';
import {useAuth} from '../../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type PointsHistory = {
  id: string;
  priority_id: string;
  points: number;
  created_at: string;
};

type Profile = {
  id: string;
  name: string;
  partner_name: string;
  partner_id: string | null;
  partner_code: string;
  partnerCode?: string;
};

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [fetchingData, setFetchingData] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const {session} = useAuth();

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
      fetchTotalPoints();
    }
  }, [session]);

  // Add a focus listener to refresh data when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Account screen focused, refreshing data');
      if (session?.user) {
        fetchTotalPoints();
      }
    });

    return unsubscribe;
  }, [navigation, session]);

  async function fetchProfile() {
    try {
      if (!session?.user) {
        console.log('No user session found');
        return;
      }

      console.log('Fetching profile for user:', session.user.id);
      
      // First get the user's profile
      const {data, error} = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile data retrieved:', data);
      
      // If this is Partner B (has a partner_id), fetch Partner A's profile to get the code
      if (data.partner_id) {
        console.log('This is Partner B, fetching Partner A\'s profile');
        const {data: partnerData, error: partnerError} = await supabase
          .from('profiles')
          .select('partner_code')
          .eq('id', data.partner_id)
          .single();
          
        if (!partnerError && partnerData) {
          console.log('Partner A\'s code retrieved:', partnerData.partner_code);
          // Add the partner's code to our profile data
          data.partnerCode = partnerData.partner_code;
        } else {
          console.error('Error fetching partner profile:', partnerError);
        }
      }
      
      setProfile(data);
    } catch (error: any) {
      console.error('Error in fetchProfile:', error.message);
      Alert.alert('Error', 'Failed to load profile information');
    }
  }

  async function generatePartnerCode() {
    try {
      if (!session?.user) return;
      
      // Check if this user is Partner A or Partner B
      const {data: myProfile, error: profileError} = await supabase
        .from('profiles')
        .select('partner_id')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        console.error('Error checking profile:', profileError);
        throw profileError;
      }
      
      // If this user has a partner_id, they are Partner B and shouldn't generate a code
      if (myProfile.partner_id) {
        Alert.alert(
          'Not Available', 
          'Only the primary partner can generate a partner code.'
        );
        return;
      }
      
      // Generate a new code for Partner A
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated new partner code:', code);
      
      // Update the profile with the new code
      const {data, error} = await supabase
        .from('profiles')
        .update({ partner_code: code })
        .eq('id', session.user.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating partner code:', error);
        throw error;
      }
      
      console.log('Profile updated with new code:', data);
      setProfile(data);
      
      // If Partner B exists, update their profile to show the same code
      if (profile?.partner_id) {
        const {error: partnerUpdateError} = await supabase
          .from('profiles')
          .update({ partner_code: code })
          .eq('id', profile.partner_id);
          
        if (partnerUpdateError) {
          console.error('Error updating partner profile:', partnerUpdateError);
          // Don't throw here, just log it
        }
      }
    } catch (error: any) {
      console.error('Error generating partner code:', error.message);
      Alert.alert('Error', 'Failed to generate partner code');
    }
  }

  async function fetchTotalPoints() {
    try {
      setFetchingData(true);
      if (!session?.user) {
        console.log('No user session found for points');
        return;
      }

      console.log('Fetching points for user:', session.user.id);
      
      const {data, error} = await supabase
        .from('points_history')
        .select('points')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching points:', error);
        throw error;
      }

      console.log('Points data retrieved:', data);
      
      const total = data.reduce((sum, item) => sum + item.points, 0);
      console.log('Total points calculated:', total);
      setTotalPoints(total);
    } catch (error: any) {
      console.error('Error in fetchTotalPoints:', error.message);
      // Don't show an alert for points error, just log it
    } finally {
      setFetchingData(false);
    }
  }

  async function handleSharePartnerCode() {
    if (!profile?.partner_code) return;
    
    try {
      await Share.share({
        message: `Join me on Priority! Use my partner code: ${profile.partner_code}`,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Could not share partner code');
    }
  }

  async function handleSignOut() {
    try {
      setLoading(true);
      console.log('Starting sign out process...');
      
      // Clear any stored session data
      const {error} = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      console.log('Successfully signed out');
      
      // Force navigation to login screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'Login'}],
        })
      );
    } catch (error: any) {
      console.error('Error during sign out:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Sign Out', onPress: handleSignOut, style: 'destructive'},
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Account</Text>
        
        {fetchingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading account information...</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon name="trophy" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoTitle}>Total Points</Text>
                </View>
                <Text style={styles.infoValue}>{totalPoints}</Text>
                <Text style={styles.infoDescription}>
                  Points earned by completing priorities
                </Text>
              </View>

              {/* Partner code section - shown to both partners */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon name="account-multiple" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoTitle}>Partner Code</Text>
                </View>
                
                {/* For Partner A - show their own code with ability to generate/share */}
                {!profile?.partner_id && (
                  profile?.partner_code ? (
                    <>
                      <View style={styles.codeContainer}>
                        <Text style={styles.partnerCode}>{profile.partner_code}</Text>
                        <TouchableOpacity 
                          style={styles.shareButton}
                          onPress={handleSharePartnerCode}>
                          <Icon name="share-variant" size={20} color={theme.colors.surface} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.infoDescription}>
                        Share this code with your partner to connect
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.noCodeContainer}>
                        <Text style={styles.noCodeText}>No partner code found</Text>
                        <TouchableOpacity 
                          style={styles.generateButton}
                          onPress={generatePartnerCode}>
                          <Text style={styles.generateButtonText}>Generate Code</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.infoDescription}>
                        Generate a code to share with your partner
                      </Text>
                    </>
                  )
                )}
                
                {/* For Partner B - show Partner A's code (read-only) */}
                {profile?.partner_id && (
                  <>
                    <View style={styles.codeContainer}>
                      <Text style={styles.partnerCode}>
                        {profile.partnerCode || profile.partner_code || 'Not available'}
                      </Text>
                    </View>
                    <Text style={styles.infoDescription}>
                      Your shared partner code
                    </Text>
                  </>
                )}
              </View>
              
              {/* Always show partner information section */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon name="account-heart" size={24} color={theme.colors.primary} />
                  <Text style={styles.infoTitle}>Partner</Text>
                </View>
                {profile?.partner_id ? (
                  <>
                    <Text style={styles.partnerName}>{profile.partner_name || 'Unknown'}</Text>
                    <Text style={styles.infoDescription}>
                      You are connected with your partner
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.partnerName}>Not connected</Text>
                    <Text style={styles.infoDescription}>
                      Share your partner code to connect
                    </Text>
                  </>
                )}
              </View>
            </View>
          </>
        )}
        
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, loading && styles.buttonDisabled]}
            onPress={confirmSignOut}
            disabled={loading}>
            <Text style={styles.signOutButtonText}>
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginBottom: 30,
  },
  infoSection: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  infoValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  infoDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textTertiary,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerCode: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.primary,
    flex: 1,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 8,
  },
  section: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: theme.colors.surface,
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  signOutButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  noCodeContainer: {
    marginBottom: 8,
  },
  noCodeText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  generateButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.surface,
  },
  partnerName: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.primary,
    marginBottom: 8,
  },
}); 