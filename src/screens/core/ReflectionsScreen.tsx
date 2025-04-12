import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CoreStackParamList} from '../../navigation/types';
import {supabase} from '../../lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme} from '../../theme';
import {useAuth} from '../../hooks/useAuth';
import {Session} from '@supabase/supabase-js';
import {generateWeeklyPrompt, getPreviousPrompts} from '../../services/promptService';

type Reflection = {
  id: string;
  week_date: string;
  highlights: string;
  challenges: string;
  gratitude: string;
  prompt_response: string;
  prompt_question: string;
  created_at: string;
};

type AuthContextType = {
  session: Session | null;
};

const ReflectionsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<CoreStackParamList>>();
  const route = useRoute();
  const {session} = useAuth() as AuthContextType;
  const promptFromHome = (route.params as any)?.weeklyPrompt || '';

  const [loading, setLoading] = useState(true);
  const [activeReflection, setActiveReflection] = useState<Reflection | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'past'>('weekly');
  const [editingSection, setEditingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchReflections();
  }, []);

  useEffect(() => {
    if (promptFromHome && activeReflection) {
      // If there's a prompt from home and it's not already set
      if (activeReflection.prompt_question !== promptFromHome) {
        setActiveReflection({
          ...activeReflection,
          prompt_question: promptFromHome,
        });
      }
      setActiveTab('weekly');
      setEditing(true);
    }
  }, [promptFromHome, activeReflection]);

  const getStartOfWeek = (date: Date) => {
    const newDate = new Date(date);
    const day = newDate.getDay(); // Sunday is 0, Saturday is 6
    // Adjust to get to the most recent Sunday
    const diff = newDate.getDate() - day;
    return new Date(newDate.setDate(diff));
  };

  const fetchReflections = async () => {
    try {
      setLoading(true);
      
      // Get the start of the current week (Sunday)
      const currentWeekStart = getStartOfWeek(new Date()).toISOString();
      
      // Fetch all reflections
      const {data, error} = await supabase
        .from('reflections')
        .select('*')
        .order('week_date', {ascending: false});
      
      if (error) throw error;

      let reflectionsData = data || [];
      
      // Check if we already have a reflection for the current week
      const existingCurrentWeekReflection = reflectionsData.find(
        r => new Date(r.week_date).toDateString() === new Date(currentWeekStart).toDateString()
      );
      
      if (!existingCurrentWeekReflection) {
        // Generate a new prompt if one isn't provided from home
        let promptQuestion = promptFromHome;
        
        if (!promptQuestion && session?.user?.id) {
          try {
            // Get previously used prompts to avoid repetition
            const previousPrompts = await getPreviousPrompts(session.user.id, 10);
            
            // Generate a new prompt using GPT-4o
            promptQuestion = await generateWeeklyPrompt({
              previousPrompts,
              userId: session.user.id
            });
            
            console.log('Generated new weekly prompt for reflection:', promptQuestion);
          } catch (promptError) {
            console.error('Error generating prompt for reflection:', promptError);
            // Fall back to default prompt
            promptQuestion = 'What made you feel appreciated this week?';
          }
        } else if (!promptQuestion) {
          // Default if no promptFromHome and no session
          promptQuestion = 'What made you feel appreciated this week?';
        }
        
        // Create a new reflection for current week
        const newReflection = {
          week_date: currentWeekStart,
          highlights: '',
          challenges: '',
          gratitude: '',
          prompt_response: '',
          prompt_question: promptQuestion,
          created_at: new Date().toISOString(),
          user_id: session?.user?.id,
        };
        
        try {
          const {data: newData, error: insertError} = await supabase
            .from('reflections')
            .insert(newReflection)
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          if (newData) {
            // Add the new reflection to the beginning of the array
            reflectionsData = [newData, ...reflectionsData];
            setActiveReflection(newData);
          }
        } catch (insertError) {
          console.error('Error creating new reflection:', insertError);
          // If database insert fails, still show the new reflection in UI
          setActiveReflection({
            id: 'temp-' + Date.now(),
            ...newReflection
          } as Reflection);
        }
      } else {
        // Use the existing current week reflection
        setActiveReflection(existingCurrentWeekReflection);
      }
      
      // Update the reflections list
      setReflections(reflectionsData);
      
      if (promptFromHome) {
        setActiveTab('weekly');
        setEditing(true);
      }
    } catch (error) {
      console.error('Error fetching reflections:', error);
      // Create a fallback reflection for the current week
      const currentWeekStart = getStartOfWeek(new Date()).toISOString();
      
      // Generate a fallback prompt
      let promptQuestion = promptFromHome;
      if (!promptQuestion) {
        try {
          if (session?.user?.id) {
            // Try to generate a prompt using the service, but don't wait too long
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Prompt generation timed out')), 3000)
            );
            
            const promptPromise = getPreviousPrompts(session.user.id, 5)
              .then(previousPrompts => generateWeeklyPrompt({previousPrompts, userId: session.user.id}));
              
            promptQuestion = await Promise.race([promptPromise, timeoutPromise]) as string;
          }
        } catch (promptError) {
          console.error('Error generating fallback prompt:', promptError);
          promptQuestion = 'What made you feel appreciated this week?';
        }
      }
      
      if (!promptQuestion) {
        promptQuestion = 'What made you feel appreciated this week?';
      }
      
      const fallbackReflection = {
        id: 'temp-' + Date.now(),
        week_date: currentWeekStart,
        highlights: '',
        challenges: '',
        gratitude: '',
        prompt_response: '',
        prompt_question: promptQuestion,
        created_at: new Date().toISOString(),
      };
      setReflections([fallbackReflection]);
      setActiveReflection(fallbackReflection);

      if (promptFromHome) {
        setActiveTab('weekly');
        setEditing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewWeeklyReflection = async () => {
    const thisWeek = getStartOfWeek(new Date()).toISOString();
    
    // Check if we already have a reflection for this week
    const existingReflection = reflections.find(
      r => new Date(r.week_date).toDateString() === new Date(thisWeek).toDateString()
    );
    
    if (existingReflection) {
      setActiveReflection(existingReflection);
      return;
    }
    
    // Generate a new prompt if one isn't provided from home
    let promptQuestion = promptFromHome;
    
    if (!promptQuestion && session?.user?.id) {
      try {
        // Get previously used prompts to avoid repetition
        const previousPrompts = await getPreviousPrompts(session.user.id, 10);
        
        // Generate a new prompt using GPT-4o
        promptQuestion = await generateWeeklyPrompt({
          previousPrompts,
          userId: session.user.id
        });
        
        console.log('Generated new weekly prompt for new reflection:', promptQuestion);
      } catch (promptError) {
        console.error('Error generating prompt for new reflection:', promptError);
        // Fall back to default prompt
        promptQuestion = 'What made you feel appreciated this week?';
      }
    } else if (!promptQuestion) {
      // Default if no promptFromHome and no session
      promptQuestion = 'What made you feel appreciated this week?';
    }
    
    const newReflection = {
      // Let Supabase generate the UUID
      week_date: thisWeek,
      highlights: '',
      challenges: '',
      gratitude: '',
      prompt_response: '',
      prompt_question: promptQuestion,
      created_at: new Date().toISOString(),
      user_id: session?.user?.id, // Add user_id from session
    };
    
    try {
      const {data, error} = await supabase
        .from('reflections')
        .insert(newReflection)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setReflections([data, ...reflections]);
        setActiveReflection(data);
      }
      
      setEditing(true);
    } catch (error) {
      console.error('Error creating new reflection:', error);
      Alert.alert('Error', 'Could not create new reflection. Please try again.');
    }
  };

  const saveReflection = async () => {
    if (!activeReflection) return;
    
    try {
      const {error} = await supabase
        .from('reflections')
        .upsert({
          id: activeReflection.id,
          user_id: session?.user?.id,
          week_date: activeReflection.week_date,
          highlights: activeReflection.highlights,
          challenges: activeReflection.challenges,
          gratitude: activeReflection.gratitude,
          prompt_response: activeReflection.prompt_response,
          prompt_question: activeReflection.prompt_question,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeReflection.id);
      
      if (error) {
        console.error('Error saving reflection:', error);
        Alert.alert('Error', 'Could not save your reflection. Please try again.');
        return;
      }
      
      // Update local state
      setReflections(
        reflections.map(r =>
          r.id === activeReflection.id ? activeReflection : r,
        ),
      );
      setEditing(false);
      setEditingSection(null);
    } catch (error) {
      console.error('Error saving reflection:', error);
      Alert.alert('Error', 'Could not save your reflection. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Weekly Prompt section (includes prompt, highlights, challenges, gratitude)
  const renderWeeklyPromptTab = () => {
    if (!activeReflection) return null;
    
    return (
      <View>
        <View style={styles.promptCardContainer}>
          <View style={styles.promptCard}>
            <Text style={styles.promptQuestion}>
              {activeReflection.prompt_question}
            </Text>
            {editingSection === 'prompt' ? (
              <View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.promptInput]}
                    multiline
                    value={activeReflection.prompt_response}
                    onChangeText={text =>
                      setActiveReflection({
                        ...activeReflection,
                        prompt_response: text,
                      })
                    }
                    placeholder="Share your thoughts..."
                    placeholderTextColor={theme.colors.textTertiary}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={styles.promptDoneButton}
                  onPress={() => {
                    setEditingSection(null);
                    saveReflection();
                  }}>
                  <Text style={styles.sectionDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.clickableContent}
                onPress={() => setEditingSection('prompt')}>
                {activeReflection.prompt_response ? (
                  <Text style={styles.promptResponse}>
                    {activeReflection.prompt_response}
                  </Text>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateText}>
                      Tap here to share your thoughts...
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Highlights */}
        <View style={styles.reflectionCard}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          {editingSection === 'highlights' ? (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  value={activeReflection.highlights}
                  onChangeText={text =>
                    setActiveReflection({
                      ...activeReflection,
                      highlights: text,
                    })
                  }
                  placeholder="What went well this week?"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={styles.sectionDoneButton}
                onPress={() => {
                  setEditingSection(null);
                  saveReflection();
                }}>
                <Text style={styles.sectionDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.clickableContent}
              onPress={() => setEditingSection('highlights')}>
              {activeReflection.highlights ? (
                <Text style={styles.textContent}>
                  {activeReflection.highlights}
                </Text>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Icon name="star-outline" size={24} color={theme.colors.primary} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateTitle}>No highlights yet</Text>
                  <Text style={styles.emptyStateText}>
                    Tap here to record the best moments of your week together
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Challenges */}
        <View style={styles.reflectionCard}>
          <Text style={styles.sectionTitle}>Challenges</Text>
          {editingSection === 'challenges' ? (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  value={activeReflection.challenges}
                  onChangeText={text =>
                    setActiveReflection({
                      ...activeReflection,
                      challenges: text,
                    })
                  }
                  placeholder="What challenges did you face?"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={styles.sectionDoneButton}
                onPress={() => {
                  setEditingSection(null);
                  saveReflection();
                }}>
                <Text style={styles.sectionDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.clickableContent}
              onPress={() => setEditingSection('challenges')}>
              {activeReflection.challenges ? (
                <Text style={styles.textContent}>
                  {activeReflection.challenges}
                </Text>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Icon name="fitness-outline" size={24} color={theme.colors.shared} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateTitle}>No challenges recorded</Text>
                  <Text style={styles.emptyStateText}>
                    Tap here to reflect on obstacles you've faced and how you overcame them
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Gratitude */}
        <View style={styles.reflectionCard}>
          <Text style={styles.sectionTitle}>Gratitude</Text>
          {editingSection === 'gratitude' ? (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  value={activeReflection.gratitude}
                  onChangeText={text =>
                    setActiveReflection({
                      ...activeReflection,
                      gratitude: text,
                    })
                  }
                  placeholder="What are you grateful for in your relationship?"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={styles.sectionDoneButton}
                onPress={() => {
                  setEditingSection(null);
                  saveReflection();
                }}>
                <Text style={styles.sectionDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.clickableContent}
              onPress={() => setEditingSection('gratitude')}>
              {activeReflection.gratitude ? (
                <Text style={styles.textContent}>
                  {activeReflection.gratitude}
                </Text>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Icon name="heart-outline" size={24} color={theme.colors.primary} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateTitle}>Express your gratitude</Text>
                  <Text style={styles.emptyStateText}>
                    Tap here to appreciate the little things that made your relationship special
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Past weeks tab showing previous reflections as cards
  const renderPastWeeksTab = () => {
    if (!activeReflection || reflections.length <= 1) {
      return (
        <View style={styles.emptyPastContainer}>
          <Icon name="calendar-outline" size={40} color={theme.colors.textTertiary} />
          <Text style={styles.emptyPastText}>No past reflections yet</Text>
          <Text style={styles.emptyPastSubtext}>Your reflection history will appear here</Text>
        </View>
      );
    }

    return (
      <View style={styles.pastWeeksContainer}>
        {reflections
          .filter(r => r.id !== activeReflection.id)
          .map(reflection => (
            <TouchableOpacity
              key={reflection.id}
              style={styles.pastWeekCard}
              onPress={() => {
                if (editing) {
                  saveReflection();
                }
                setActiveReflection(reflection);
                setActiveTab('weekly');
                setEditing(false);
              }}>
              <View style={styles.pastWeekHeader}>
                <Text style={styles.pastWeekDate}>
                  Week of {formatDate(reflection.week_date)}
                </Text>
              </View>
              
              <View style={styles.pastWeekDivider} />
              
              <View style={styles.pastWeekContent}>
                <Text style={styles.pastWeekPrompt} numberOfLines={2}>
                  {reflection.prompt_question}
                </Text>
                {reflection.prompt_response ? (
                  <Text style={styles.pastWeekResponse} numberOfLines={3}>
                    {reflection.prompt_response}
                  </Text>
                ) : (
                  <Text style={styles.pastWeekResponseEmpty}>No response recorded</Text>
                )}
              </View>
              
              <View style={styles.pastWeekFooter}>
                <Text style={styles.viewFullText}>View full reflection</Text>
                <Icon name="chevron-forward" size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
      </View>
    );
  };

  // Modified render method
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (editing) {
              saveReflection();
            }
            navigation.goBack();
          }}>
          <Icon name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Reflections</Text>
        <View style={{width: 40}} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{flex: 1}}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              {activeReflection && (
                <>
                  <View style={styles.dateContainer}>
                    <Text style={styles.weekLabel}>
                      Week of {formatDate(activeReflection.week_date)}
                    </Text>
                  </View>

                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        activeTab === 'weekly' && styles.activeTab,
                      ]}
                      onPress={() => {
                        if (editing && activeTab !== 'weekly') {
                          saveReflection();
                        }
                        setActiveTab('weekly');
                      }}>
                      <Text 
                        style={[
                          styles.tabText,
                          activeTab === 'weekly' && styles.activeTabText,
                        ]}>
                        Weekly Prompt
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.tab,
                        activeTab === 'past' && styles.activeTab,
                      ]}
                      onPress={() => {
                        if (editing && activeTab !== 'past') {
                          saveReflection();
                        }
                        setActiveTab('past');
                      }}>
                      <Text 
                        style={[
                          styles.tabText,
                          activeTab === 'past' && styles.activeTabText,
                        ]}>
                        Past Weeks
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {activeTab === 'weekly' ? renderWeeklyPromptTab() : renderPastWeeksTab()}
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontFamily: theme.fonts.medium,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 4,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 30,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  activeTabText: {
    color: '#fff',
  },
  reflectionCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: theme.fonts.bold,
  },
  promptCardContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  promptQuestion: {
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
    marginBottom: 12,
    paddingHorizontal: 4,
    lineHeight: 22,
  },
  promptInput: {
    backgroundColor: 'rgba(0, 170, 126, 0.05)',
    borderColor: theme.colors.primary,
    color: theme.colors.textPrimary,
    minHeight: 140,
  },
  promptResponse: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    fontFamily: theme.fonts.regular,
  },
  promptEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  promptEmptyTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  promptEmptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  promptDoneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  textContent: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    fontFamily: theme.fonts.regular,
  },
  pastReflections: {
    marginTop: 8,
  },
  pastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  pastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pastDate: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: theme.fonts.medium,
  },
  floatingEditButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emptyStateIcon: {
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionDoneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionDoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: theme.fonts.medium,
  },
  clickableContent: {
    width: '100%', 
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  emptyPastContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyPastText: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPastSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  pastWeeksContainer: {
    paddingBottom: 20,
  },
  pastWeekCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  pastWeekHeader: {
    padding: 16,
    backgroundColor: 'rgba(0, 170, 126, 0.05)',
  },
  pastWeekDate: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  pastWeekDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  pastWeekContent: {
    padding: 16,
  },
  pastWeekPrompt: {
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  pastWeekResponse: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  pastWeekResponseEmpty: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  pastWeekFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewFullText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: theme.colors.primary,
  },
});

export default ReflectionsScreen; 