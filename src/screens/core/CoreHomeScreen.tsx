import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CoreStackParamList} from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {generateWeeklyPrompt, getPreviousPrompts} from '../../services/promptService';

type Props = NativeStackScreenProps<CoreStackParamList, 'CoreHome'>;

export default function CoreHomeScreen({navigation}: Props) {
  const {profile, session} = useAuth();
  const partnerName = profile?.partner_name || 'your partner';
  const [loading, setLoading] = useState(true);
  
  // Placeholder data for the dashboard
  const [relationshipPulse, setRelationshipPulse] = useState({
    score: 85, // 0-100
    completed: 12,
    total: 15,
    streak: 5,
    lastActivity: 'Yesterday'
  });
  
  const [weeklyPrompt, setWeeklyPrompt] = useState(
    "What made you feel appreciated this week?"
  );

  // Function to fetch or generate a new weekly prompt
  const fetchWeeklyPrompt = async () => {
    try {
      if (!session?.user?.id) {
        return;
      }

      // Get previously used prompts to avoid repetition
      const previousPrompts = await getPreviousPrompts(session.user.id, 10);
      
      // Generate a new prompt using GPT-4o
      const newPrompt = await generateWeeklyPrompt({
        previousPrompts,
        userId: session.user.id
      });
      
      setWeeklyPrompt(newPrompt);
      console.log('New weekly prompt set:', newPrompt);
    } catch (error) {
      console.error('Error fetching weekly prompt:', error);
      // Keep the default prompt if there's an error
    }
  };

  useEffect(() => {
    // Fetch data and prompt
    const loadData = async () => {
      try {
        // This would be replaced with actual data fetching for the relationship pulse
        // Simulate data loading with setTimeout
        setTimeout(async () => {
          await fetchWeeklyPrompt();
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading home screen data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [session]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Core</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Core</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>
          Good {getTimeOfDay()}, {profile?.name || 'there'}
        </Text>
        
        {/* Relationship Pulse */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Relationship Pulse</Text>
        </View>
        
        <View style={styles.pulseCard}>
          <View style={styles.pulseScoreContainer}>
            <Text style={styles.pulseScore}>{relationshipPulse.score}</Text>
            <Text style={styles.pulseScoreLabel}>Health Score</Text>
          </View>
          
          <View style={styles.pulseDivider} />
          
          <View style={styles.pulseStats}>
            <View style={styles.pulseStat}>
              <Icon name="check-circle-outline" size={22} color={theme.colors.success} />
              <Text style={styles.pulseStatValue}>{relationshipPulse.completed}/{relationshipPulse.total}</Text>
              <Text style={styles.pulseStatLabel}>Tasks Done</Text>
            </View>
            
            <View style={styles.pulseStat}>
              <Icon name="fire" size={22} color={theme.colors.shared} />
              <Text style={styles.pulseStatValue}>{relationshipPulse.streak} days</Text>
              <Text style={styles.pulseStatLabel}>Streak</Text>
            </View>
            
            <View style={styles.pulseStat}>
              <Icon name="clock-outline" size={22} color={theme.colors.partnerA} />
              <Text style={styles.pulseStatValue}>{relationshipPulse.lastActivity}</Text>
              <Text style={styles.pulseStatLabel}>Activity</Text>
            </View>
          </View>
        </View>
        
        {/* Weekly Reflection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Reflection</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('Reflections', { weeklyPrompt })}
          >
            <Text style={styles.editButtonText}>Respond</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.reflectionCard}
          onPress={() => navigation.navigate('Reflections', { weeklyPrompt })}
          activeOpacity={0.9}
        >
          <Icon name="calendar-text" size={28} color={theme.colors.shared} style={styles.notesIcon} />
          <Text style={styles.reflectionPrompt}>{weeklyPrompt}</Text>
        </TouchableOpacity>
        
        {/* Partner Notes Section - added at the bottom */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Partner Notes</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('Notes')}
          >
            <Text style={styles.editButtonText}>View</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.notesCard}
          onPress={() => navigation.navigate('Notes')}
          activeOpacity={0.9}
        >
          <Icon name="note-text-outline" size={28} color={theme.colors.partnerA} style={styles.notesIcon} />
          <Text style={styles.notesText}>
            Capture important details about {partnerName}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
  
  // Helper functions
  function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: theme.fontSizes.xlarge,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greeting: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.textPrimary,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.primary,
  },
  pulseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pulseScoreContainer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  pulseScore: {
    fontFamily: theme.fonts.bold,
    fontSize: 36,
    color: theme.colors.primary,
  },
  pulseScoreLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  pulseDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 8,
  },
  pulseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  pulseStat: {
    alignItems: 'center',
  },
  pulseStatValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  pulseStatLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  reflectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reflectionPrompt: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  notesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  notesIcon: {
    marginRight: 16,
  },
  notesText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    flex: 1,
  },
}); 