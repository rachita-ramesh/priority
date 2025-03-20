import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TasksStackParamList} from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import NotificationService from '../../services/NotificationService';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskCreate'>;

type AssignmentType = 'me' | 'partner' | 'both';

export default function TaskCreateScreen({navigation}: Props) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentType>('me');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const {session} = useAuth();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownItems, setDropdownItems] = useState([
    {label: 'Me', value: 'me'},
    {label: 'Partner', value: 'partner'},
    {label: 'Both', value: 'both'},
  ]);

  useEffect(() => {
    fetchPartnerProfile();
  }, []);
  
  // Update dropdown items when partner profile is loaded
  useEffect(() => {
    if (partnerProfile) {
      const myName = partnerProfile.me?.name || 'Me';
      const partnerName = partnerProfile.partner?.name || 'Partner';
      
      console.log('Updating dropdown with names:', { myName, partnerName });
      
      setDropdownItems([
        {label: myName, value: 'me'},
        {label: partnerName, value: 'partner'},
        {label: 'Both', value: 'both'},
      ]);
    }
  }, [partnerProfile]);

  // Format date for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  async function fetchPartnerProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('partner_id, email, name, partner_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching my profile:', profileError);
        return;
      }

      // Even if there's no partner_id, we still want to set the user's profile
      setPartnerProfile({
        me: { id: user.id, email: myProfile.email, name: myProfile.name || 'Me' },
        partner: null
      });

      if (!myProfile?.partner_id) {
        console.log('No partner ID found');
        return;
      }

      const { data: partner, error: partnerError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('id', myProfile.partner_id)
        .single();

      if (partnerError) {
        console.error('Error fetching partner profile:', partnerError);
        return;
      }

      setPartnerProfile({
        me: { id: user.id, email: myProfile.email, name: myProfile.name || 'Me' },
        partner: partner
      });
      
      console.log('Partner profile set:', {
        me: { id: user.id, name: myProfile.name },
        partner: partner
      });
    } catch (error) {
      console.error('Error in fetchPartnerProfile:', error);
    }
  }

  async function handleCreateTask() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a priority title');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Log the current state for debugging
      console.log('Creating priority with:', {
        title: title.trim(),
        dueDate: dueDate.toISOString(),
        assignment,
        userId: user.id,
        partnerProfile
      });

      // Fix the data structure for the priorities table
      const priorityData = {
        title: title.trim(),
        description: '', // Add an empty description field
        due_date: dueDate.toISOString(),
        status: 'pending',
        creator_id: user.id,
        assignee_id: assignment === 'partner' && partnerProfile?.partner
          ? partnerProfile.partner.id
          : user.id,  // Default to user's ID for 'me' or if partner not found
        is_shared: assignment === 'both' // Set is_shared flag for shared tasks
      };

      console.log('Sending priority data:', priorityData);

      const {data, error} = await supabase.from('priorities').insert(priorityData).select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Priority created successfully:', data);
      
      // Schedule a notification if the task is assigned to the current user
      if (data && data.length > 0) {
        const newTask = data[0];
        
        if (newTask.assignee_id === user.id || newTask.is_shared) {
          console.log('Scheduling notification for new task:', newTask.id);
          NotificationService.scheduleDueDateReminder(newTask);
        }
      }
      
      // Force a refresh of the tasks list when navigating back
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating priority:', error);
      Alert.alert('Error', error.message || 'Failed to create priority. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const getAssigneeLabel = (type: AssignmentType) => {
    if (!partnerProfile) return type === 'both' ? 'Both' : 'Me';
    
    const myName = partnerProfile.me?.name || 'Me';
    const partnerName = partnerProfile.partner?.name || 'Partner';
    
    switch (type) {
      case 'me':
        return myName;
      case 'partner':
        return partnerName;
      case 'both':
        return 'Both';
      default:
        return myName;
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.modalContent}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter priority title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={theme.colors.input.placeholder}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
              <Text style={styles.datePickerArrow}>▼</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
                textColor={theme.colors.textPrimary}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assign To</Text>
            <DropDownPicker
              open={dropdownOpen}
              value={assignment}
              items={dropdownItems}
              setOpen={setDropdownOpen}
              setValue={setAssignment}
              setItems={setDropdownItems}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              textStyle={styles.dropdownText}
              placeholder="Select assignee"
              zIndex={3000}
              zIndexInverse={1000}
            />
          </View>

          <View style={[styles.buttonContainer, dropdownOpen && {marginTop: 120}]}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreateTask}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Creating...' : 'Create Priority'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    marginHorizontal: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  scrollContent: {
    padding: 20,
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
  datePickerButton: {
    height: 50,
    backgroundColor: theme.colors.input.background,
    borderWidth: 1,
    borderColor: theme.colors.input.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.input.text,
  },
  datePickerArrow: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  dropdown: {
    height: 50,
    backgroundColor: theme.colors.input.background,
    borderWidth: 1,
    borderColor: theme.colors.input.border,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.input.border,
    borderWidth: 1,
  },
  dropdownText: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.input.text,
  },
  buttonContainer: {
    marginTop: 30,
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
  cancelButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
  },
}); 