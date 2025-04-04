import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CoreStackParamList} from '../../navigation/types';
import {supabase} from '../../lib/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';

type GrowthGoal = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: 'active' | 'complete';
};

type GrowthSpace = {
  id: string;
  priority: string;
  partner_goal: string;
  support_action: string;
};

type Vision = {
  id: string;
  content: string;
  created_at: string;
};

const GrowthScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<CoreStackParamList>>();
  const {profile} = useAuth();
  const partnerName = profile?.partner_name || 'Partner';
  
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<GrowthGoal[]>([]);
  const [growthSpace, setGrowthSpace] = useState<GrowthSpace>({
    id: '1',
    priority: 'Plan our anniversary trip',
    partner_goal: 'Read more books',
    support_action: 'Give 30 minutes of quiet time in evenings',
  });
  
  const [isEditingSpace, setIsEditingSpace] = useState(false);
  const [editingSpace, setEditingSpace] = useState<GrowthSpace>({
    id: '1',
    priority: '',
    partner_goal: '',
    support_action: '',
  });
  
  // New state for adding goals
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
  });
  
  // Vision state
  const [vision, setVision] = useState<Vision | null>(null);
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [newVision, setNewVision] = useState('');

  useEffect(() => {
    fetchGoals();
    fetchGrowthSpace();
    fetchVision();
  }, []);

  const fetchVision = async () => {
    try {
      // This is a placeholder - we'll need to create this table
      const {data, error} = await supabase
        .from('relationship_vision')
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setVision(data as Vision);
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
      // Use default data if table doesn't exist yet
    }
  };
  
  const updateVision = async () => {
    if (!newVision.trim()) {
      Alert.alert('Error', 'Please enter your vision');
      return;
    }
    
    try {
      const visionData = {
        id: vision?.id || '1',
        content: newVision,
        created_at: new Date().toISOString(),
      };
      
      // This is a placeholder - we'll need to create this table
      const {error} = await supabase
        .from('relationship_vision')
        .upsert(visionData);
      
      if (error) throw error;
      
      // Update local state
      setVision(visionData);
      setIsEditingVision(false);
    } catch (error) {
      console.error('Error updating vision:', error);
      // Update local state anyway for demo purposes
      setVision({
        id: vision?.id || '1',
        content: newVision,
        created_at: new Date().toISOString(),
      });
      setIsEditingVision(false);
    }
  };

  const fetchGrowthSpace = async () => {
    try {
      // This is a placeholder - we'll need to create this table
      const {data, error} = await supabase
        .from('growth_space')
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setGrowthSpace(data as GrowthSpace);
      }
    } catch (error) {
      console.error('Error fetching growth space:', error);
      // Use default data if table doesn't exist yet
    }
  };

  const updateGrowthSpace = async () => {
    if (!editingSpace.priority.trim()) {
      Alert.alert('Error', 'Please enter a priority');
      return;
    }
    
    try {
      // This is a placeholder - we'll need to create this table
      const {error} = await supabase
        .from('growth_space')
        .upsert({
          ...editingSpace,
          id: growthSpace.id,
        });
      
      if (error) throw error;
      
      // Update local state
      setGrowthSpace(editingSpace);
      setIsEditingSpace(false);
    } catch (error) {
      console.error('Error updating growth space:', error);
      // Update local state anyway
      setGrowthSpace(editingSpace);
      setIsEditingSpace(false);
    }
  };

  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      // This is a placeholder - we'll need to create this table
      const {data, error} = await supabase
        .from('growth_goals')
        .select('*')
        .order('created_at', {ascending: false});
      
      if (error) throw error;
      
      if (data) {
        setGoals(data as GrowthGoal[]);
      }
    } catch (error) {
      console.error('Error fetching growth goals:', error);
      // If table doesn't exist yet, use placeholder data
      setGoals([
        {
          id: '1',
          title: 'Improve Communication',
          description: 'Practice active listening during discussions',
          created_at: new Date().toISOString(),
          status: 'active',
        },
        {
          id: '2',
          title: 'Quality Time',
          description: 'Schedule one date night every week',
          created_at: new Date().toISOString(),
          status: 'active',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalStatus = async (id: string, currentStatus: 'active' | 'complete') => {
    const newStatus = currentStatus === 'active' ? 'complete' : 'active';
    
    // Update locally first for immediate feedback
    setGoals(
      goals.map(goal =>
        goal.id === id ? {...goal, status: newStatus} : goal,
      ),
    );
    
    try {
      // This is a placeholder - we'll need to create this table
      const {error} = await supabase
        .from('growth_goals')
        .update({status: newStatus})
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating goal status:', error);
      // Revert on failure
      setGoals(
        goals.map(goal =>
          goal.id === id ? {...goal, status: currentStatus} : goal,
        ),
      );
    }
  };
  
  // Add new goal function
  const addNewGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }
    
    // Create a new goal object
    const goalData = {
      id: Date.now().toString(), // Temporary ID for local state
      title: newGoal.title,
      description: newGoal.description,
      created_at: new Date().toISOString(),
      status: 'active' as const,
    };
    
    // Add to local state first for immediate feedback
    setGoals([goalData, ...goals]);
    
    try {
      // This is a placeholder - we'll need to create this table
      const {data, error} = await supabase
        .from('growth_goals')
        .insert(goalData)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update with the real ID from the database if needed
      if (data) {
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalData.id ? data : goal
          )
        );
      }
    } catch (error) {
      console.error('Error adding new goal:', error);
      // Goal is already added to local state, so we keep it
    } finally {
      // Reset form and close modal
      setNewGoal({title: '', description: ''});
      setIsAddingGoal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Growth Space</Text>
        <View style={{width: 40}} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Growth Space Section */}
          <View style={styles.growthSpaceHeader}>
            <Text style={styles.sectionTitle}>
              Our Growth Focus
            </Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setEditingSpace({...growthSpace});
                setIsEditingSpace(true);
              }}>
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.growthCard}>
            <View style={styles.growthItem}>
              <View style={[styles.growthColorAccent, {backgroundColor: '#00B478'}]} />
              <View style={styles.growthContent}>
                <Text style={styles.growthLabel}>Our Priority</Text>
                <Text style={styles.growthText}>{growthSpace.priority}</Text>
              </View>
            </View>
            
            <View style={styles.growthItem}>
              <View style={[styles.growthColorAccent, {backgroundColor: '#8974DB'}]} />
              <View style={styles.growthContent}>
                <Text style={styles.growthLabel}>{partnerName}'s Goal</Text>
                <Text style={styles.growthText}>{growthSpace.partner_goal}</Text>
              </View>
            </View>
            
            <View style={styles.growthItem}>
              <View style={[styles.growthColorAccent, {backgroundColor: '#00B478'}]} />
              <View style={styles.growthContent}>
                <Text style={styles.growthLabel}>How You Can Help</Text>
                <Text style={styles.growthText}>{growthSpace.support_action}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.sectionTitle}>
            Growth Goals
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : goals.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                You haven't added any growth goals yet.
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setIsAddingGoal(true)}>
                <Text style={styles.actionButtonText}>Add your goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.goalsList}>
              {goals.map(goal => (
                <View key={goal.id} style={styles.goalCard}>
                  <TouchableOpacity
                    style={[
                      styles.statusCircle,
                      goal.status === 'complete' && styles.statusComplete,
                    ]}
                    onPress={() => toggleGoalStatus(goal.id, goal.status)}>
                    {goal.status === 'complete' && (
                      <Icon name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.goalContent}>
                    <Text style={[
                      styles.goalTitle,
                      goal.status === 'complete' && styles.completedText,
                    ]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalDescription}>
                      {goal.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.visionSection}>
            <Text style={styles.sectionTitle}>Relationship Vision</Text>
            <View style={styles.visionCard}>
              {vision ? (
                <View>
                  <Text style={styles.visionContent}>{vision.content}</Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setNewVision(vision.content);
                      setIsEditingVision(true);
                    }}>
                    <Text style={styles.actionButtonText}>Edit vision</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.visionPrompt}>
                    What does your ideal relationship look like in 1 year?
                  </Text>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => {
                        setNewVision('');
                        setIsEditingVision(true);
                      }}>
                      <Text style={styles.actionButtonText}>Add your vision</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Growth Space Modal */}
      <Modal
        visible={isEditingSpace}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditingSpace(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Growth Focus</Text>
              <TouchableOpacity
                onPress={() => setIsEditingSpace(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Our Priority</Text>
            <TextInput
              style={styles.input}
              value={editingSpace.priority}
              onChangeText={(text) => 
                setEditingSpace({...editingSpace, priority: text})
              }
              placeholder="What's your main relationship focus?"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.inputLabel}>{partnerName}'s Goal</Text>
            <TextInput
              style={styles.input}
              value={editingSpace.partner_goal}
              onChangeText={(text) => 
                setEditingSpace({...editingSpace, partner_goal: text})
              }
              placeholder="What is your partner working on?"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.inputLabel}>How You Can Help</Text>
            <TextInput
              style={styles.input}
              value={editingSpace.support_action}
              onChangeText={(text) => 
                setEditingSpace({...editingSpace, support_action: text})
              }
              placeholder="How can you support your partner?"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={updateGrowthSpace}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Add New Goal Modal */}
      <Modal
        visible={isAddingGoal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddingGoal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Growth Goal</Text>
              <TouchableOpacity
                onPress={() => setIsAddingGoal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Goal Title</Text>
            <TextInput
              style={styles.input}
              value={newGoal.title}
              onChangeText={(text) => 
                setNewGoal({...newGoal, title: text})
              }
              placeholder="E.g., Improve communication"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newGoal.description}
              onChangeText={(text) => 
                setNewGoal({...newGoal, description: text})
              }
              placeholder="Add more details about your goal"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={addNewGoal}
            >
              <Text style={styles.saveButtonText}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Vision Modal */}
      <Modal
        visible={isEditingVision}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditingVision(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Relationship Vision</Text>
              <TouchableOpacity
                onPress={() => setIsEditingVision(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>What does your ideal relationship look like in 1 year?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newVision}
              onChangeText={setNewVision}
              placeholder="Describe your vision for your relationship..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={updateVision}
            >
              <Text style={styles.saveButtonText}>Save Vision</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  growthSpaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  growthCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  growthItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  growthColorAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  growthContent: {
    flex: 1,
  },
  growthLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 4,
    fontFamily: theme.fonts.regular,
  },
  growthText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
  },
  goalsList: {
    marginBottom: 24,
  },
  goalCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
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
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusComplete: {
    backgroundColor: theme.colors.primary,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.medium,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textTertiary,
  },
  goalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  visionSection: {
    marginTop: 8,
  },
  visionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  visionPrompt: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    fontFamily: theme.fonts.medium,
  },
  visionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  closeButton: {
    padding: 5,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontFamily: theme.fonts.medium,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: theme.fonts.regular,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: theme.fonts.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
});

export default GrowthScreen; 