import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TasksStackParamList} from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskEdit'>;

export default function TaskEditScreen({route, navigation}: Props) {
  const {taskId} = route.params;
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const {session} = useAuth();

  useEffect(() => {
    fetchTask();
  }, []);

  async function fetchTask() {
    try {
      const {data, error} = await supabase
        .from('priorities')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setDueDate(new Date(data.due_date));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', message);
    } finally {
      setFetchLoading(false);
    }
  }

  async function handleUpdateTask() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a priority title');
      return;
    }

    try {
      setLoading(true);
      const {error} = await supabase
        .from('priorities')
        .update({
          title: title.trim(),
          due_date: dueDate.toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask() {
    Alert.alert(
      'Delete Priority',
      'Are you sure you want to delete this priority?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const {error} = await supabase
                .from('priorities')
                .delete()
                .eq('id', taskId);

              if (error) throw error;
              navigation.goBack();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'An unexpected error occurred';
              Alert.alert('Error', message);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  if (fetchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Task</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter task title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={theme.colors.input.placeholder}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date</Text>
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (selectedDate) setDueDate(selectedDate);
            }}
            minimumDate={new Date()}
            textColor={theme.colors.textPrimary}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateTask}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Task'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteTask}
            disabled={loading}>
            <Text style={styles.deleteButtonText}>Delete Task</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginBottom: 30,
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
  deleteButton: {
    backgroundColor: theme.colors.error,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButtonText: {
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