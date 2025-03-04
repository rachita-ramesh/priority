import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {TasksStackParamList} from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<TasksStackParamList, 'TasksList'>;

type Task = {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'completed';
  creator_id: string;
  assignee_id: string;
  is_shared: boolean;
};

type FilterType = 'all' | 'me' | 'partner' | 'both';

export default function TasksListScreen({navigation}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const {session, profile} = useAuth();

  useEffect(() => {
    fetchTasks();
    if (profile) {
      console.log('Profile data in TasksListScreen:', {
        name: profile.name,
        partner_name: profile.partner_name,
        partner_id: profile.partner_id,
        partner_code: profile.partner_code
      });
    } else {
      console.log('No profile data available in TasksListScreen');
    }
    
    // Add a focus listener to refresh tasks when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('TasksList screen focused, refreshing tasks');
      fetchTasks();
      
      // Test Supabase permissions when screen is focused
      testSupabasePermissions();
    });

    return unsubscribe;
  }, [profile, navigation]);

  useEffect(() => {
    if (tasks.length > 0) {
      filterTasks(activeFilter);
    } else {
      setFilteredTasks([]);
    }
  }, [tasks, activeFilter]);

  async function fetchTasks() {
    try {
      setLoading(true);
      if (!session?.user.id) {
        console.error('No user session found');
        return;
      }

      console.log('Fetching tasks for user:', session.user.id);

      // First get the partner ID from the profile
      if (!profile || !profile.partner_id) {
        console.log('No partner ID found - fetching without partner tasks');
        // Fetch only user's tasks if no partner exists
        const {data, error} = await supabase
          .from('priorities')
          .select('*')
          .or(`creator_id.eq.${session.user.id},assignee_id.eq.${session.user.id},is_shared.eq.true`)
          .order('due_date', {ascending: true});

        if (error) {
          console.error('Error fetching tasks:', error);
          throw error;
        }

        if (!data) {
          console.log('No tasks found');
          setTasks([]);
        } else {
          console.log('Fetched tasks:', data.length);
          setTasks(data);
        }
      } else {
        // Fetch all tasks where:
        // 1. The user is either the creator or assignee
        // 2. OR the partner is either the creator or assignee
        console.log('Fetching tasks for user and partner:', profile.partner_id);
        const {data, error} = await supabase
          .from('priorities')
          .select('*')
          .or(`creator_id.eq.${session.user.id},assignee_id.eq.${session.user.id},creator_id.eq.${profile.partner_id},assignee_id.eq.${profile.partner_id}`)
          .order('due_date', {ascending: true});

        if (error) {
          console.error('Error fetching tasks:', error);
          throw error;
        }

        if (!data) {
          console.log('No tasks found');
          setTasks([]);
        } else {
          console.log('Fetched tasks:', data.length);
          setTasks(data);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      setLoading(false);
    }
  }

  function filterTasks(filterType: FilterType) {
    if (!profile || !session) return;
    
    console.log('Filtering tasks by:', filterType);
    console.log('Available tasks for filtering:', tasks.length);
    
    let filtered: Task[] = [];
    
    switch (filterType) {
      case 'all':
        filtered = tasks;
        break;
      case 'me':
        // Only show tasks where the current user is the assignee
        filtered = tasks.filter(task => 
          task.assignee_id === session.user.id && !task.is_shared
        );
        break;
      case 'partner':
        // Only show tasks where the partner is the assignee
        filtered = tasks.filter(task => 
          task.assignee_id === profile.partner_id && !task.is_shared
        );
        break;
      case 'both':
        // Only include tasks that are explicitly marked as shared
        filtered = tasks.filter(task => task.is_shared === true);
        break;
    }
    
    console.log('Filtered tasks:', filtered.length);
    setFilteredTasks(filtered);
    
    // Separate active and completed tasks
    const active = filtered.filter(task => task.status === 'pending');
    const completed = filtered.filter(task => task.status === 'completed');
    
    console.log('Active tasks:', active.length);
    console.log('Completed tasks:', completed.length);
    
    // Log a few active tasks for debugging
    if (active.length > 0) {
      console.log('Sample active tasks:', active.slice(0, 2).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status
      })));
    }
    
    // Log a few completed tasks for debugging
    if (completed.length > 0) {
      console.log('Sample completed tasks:', completed.slice(0, 2).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status
      })));
    }
    
    setActiveTasks(active);
    setCompletedTasks(completed);
  }

  async function handleCompleteTask(taskId: string) {
    try {
      const taskToComplete = tasks.find(task => task.id === taskId);
      
      if (!taskToComplete) {
        console.error('Task not found');
        return;
      }
      
      // Check if the task is already completed
      if (taskToComplete.status === 'completed') {
        console.log('Task is already completed:', taskId);
        Alert.alert('Info', 'This task is already marked as completed.');
        return;
      }
      
      console.log('Completing task:', {
        taskId,
        title: taskToComplete.title,
        creator_id: taskToComplete.creator_id,
        assignee_id: taskToComplete.assignee_id,
        is_shared: taskToComplete.is_shared
      });
      
      if (!session?.user.id) {
        console.error('No user session found');
        Alert.alert('Error', 'You must be logged in to complete tasks');
        return;
      }
      
      // Try to determine if we have permission to update this task
      const canUpdate = 
        taskToComplete.creator_id === session.user.id || 
        taskToComplete.assignee_id === session.user.id || 
        taskToComplete.is_shared;
        
      if (!canUpdate) {
        console.error('User may not have permission to update this task');
      }
      
      // Update the task status in Supabase
      console.log('Sending update to Supabase for task:', taskId);
      
      // First approach: Try using RPC call if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'update_task_status',
          { 
            task_id: taskId,
            new_status: 'completed',
            user_id: session.user.id
          }
        );
        
        if (!rpcError) {
          console.log('Task updated successfully via RPC:', rpcData);
          
          // Update local state
          const updatedTasks = tasks.map(task => 
            task.id === taskId ? {...task, status: 'completed' as const} : task
          );
          setTasks(updatedTasks);
          
          // Add points for completing task
          await addPointsForTask(taskId);
          
          // Refresh the task list after a short delay
          setTimeout(() => {
            fetchTasks();
          }, 500);
          
          return;
        } else {
          console.log('RPC approach failed, falling back to direct update:', rpcError);
        }
      } catch (rpcAttemptError) {
        console.log('RPC function not available, falling back to direct update');
      }
      
      // Second approach: Try direct update with more specific conditions
      const { data, error } = await supabase
        .from('priorities')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .eq('status', 'pending') // Only update if status is currently pending
        .or(`creator_id.eq.${session.user.id},assignee_id.eq.${session.user.id},is_shared.eq.true`)
        .select();

      if (error) {
        console.error('Error updating task status:', error);
        Alert.alert('Error', `Failed to update task: ${error.message}`);
        return;
      }
      
      console.log('Supabase update response:', data);
      
      if (!data || data.length === 0) {
        console.error('No rows were updated in the database');
        
        // Third approach: Try a more permissive update as a last resort
        console.log('Trying more permissive update...');
        const { data: lastAttemptData, error: lastAttemptError } = await supabase
          .from('priorities')
          .update({ status: 'completed' })
          .eq('id', taskId)
          .select();
          
        if (lastAttemptError) {
          console.error('Final update attempt failed:', lastAttemptError);
          Alert.alert('Error', 'Task status could not be updated. Please try again.');
          return;
        }
        
        if (!lastAttemptData || lastAttemptData.length === 0) {
          console.error('All update attempts failed');
          Alert.alert('Error', 'Task status could not be updated. Please try again.');
          return;
        }
        
        console.log('Final update attempt succeeded:', lastAttemptData);
      }
      
      // Update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? {...task, status: 'completed' as const} : task
      );
      setTasks(updatedTasks);
      
      // Add points for completing task
      await addPointsForTask(taskId);
      
      // Refresh the task list after a short delay
      setTimeout(() => {
        fetchTasks();
      }, 500);
      
    } catch (error: any) {
      console.error('Task completion error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  }
  
  async function addPointsForTask(taskId: string) {
    try {
      // Get the task details to determine assignee
      const taskToComplete = tasks.find(task => task.id === taskId);
      
      if (!taskToComplete || !session?.user.id || !profile) {
        console.error('Missing task, user, or profile data for points allocation', {
          taskExists: !!taskToComplete,
          sessionUserExists: !!session?.user.id,
          profileExists: !!profile
        });
        return;
      }
      
      // Check if the task is completed before the due date
      const currentDate = new Date();
      const dueDate = new Date(taskToComplete.due_date);
      const isCompletedBeforeDueDate = currentDate <= dueDate;
      
      console.log('Task completion timing check:', {
        taskId,
        currentDate: currentDate.toISOString(),
        dueDate: dueDate.toISOString(),
        isCompletedBeforeDueDate
      });
      
      // If the task is completed after the due date, don't award points
      if (!isCompletedBeforeDueDate) {
        console.log(`Task ${taskId} completed after due date. No points awarded.`);
        return;
      }
      
      // Check if this is a shared task
      const isSharedTask = taskToComplete.is_shared;
      
      console.log('Task assignment check:', {
        taskId,
        assigneeId: taskToComplete.assignee_id,
        isSharedTask
      });
      
      try {
        // Use a single RPC call to award points to both users for shared tasks
        // or just the current user for individual tasks
        const { data, error } = await supabase.rpc('award_points_for_task', {
          task_id: taskId,
          user_id: session.user.id,
          is_shared: isSharedTask,
          partner_id: profile.partner_id || null
        });
        
        if (error) {
          console.error('Error awarding points:', error);
          Alert.alert(
            'Error',
            'There was an error awarding points for this task. Please try again later.'
          );
        } else {
          console.log('Points awarded successfully:', data);
          
          // Show success message
          if (isSharedTask) {
            Alert.alert(
              'Your partner appreciates this!',
              'You and your partner each earn one point.'
            );
          } else {
            Alert.alert(
              'Your partner appreciates this!',
              'You earn 1 point.'
            );
          }
        }
      } catch (rpcError) {
        console.error('RPC error awarding points:', rpcError);
        
        // Fallback to direct inserts if RPC fails
        console.log('Falling back to direct inserts...');
        
        // For the current user
        try {
          const { error: userError } = await supabase.from('points_history').insert({
            user_id: session.user.id,
            priority_id: taskId,
            points: 1
          });
          
          if (userError) {
            console.error('Error adding points for current user:', userError);
          } else {
            console.log('Successfully added points for current user');
            
            // Show success message for current user
            Alert.alert(
              'Your partner appreciates this!',
              isSharedTask 
                ? 'You and your partner each earn one point.'
                : 'You earn 1 point.'
            );
          }
        } catch (insertError) {
          console.error('Insert error for current user:', insertError);
        }
      }
    } catch (error) {
      console.error('Error adding points:', error);
      Alert.alert('Error', 'There was an unexpected error. Please try again.');
    }
  }

  function getAssigneeLabel(task: Task) {
    if (!profile || !session) return '';
    
    if (task.is_shared) {
      return 'Both';
    } else if (task.assignee_id === session.user.id) {
      return profile.name || 'Me';
    } else if (task.assignee_id === profile.partner_id) {
      return profile.partner_name || 'Partner';
    }
    return '';
  }

  // Get the border color based on who the task is assigned to
  function getAssigneeColor(task: Task) {
    if (!profile || !session) return theme.colors.border;
    
    if (task.is_shared) {
      return theme.colors.shared; // Shared tasks
    } else if (task.assignee_id === session.user.id) {
      return theme.colors.partnerA; // Current user (Partner A)
    } else if (task.assignee_id === profile.partner_id) {
      return theme.colors.partnerB; // Partner B
    }
    return theme.colors.border;
  }

  // Get the background color for the assignee tag
  function getAssigneeTagColor(task: Task) {
    if (!profile || !session) return theme.colors.primaryLight;
    
    if (task.status === 'completed') {
      return 'rgba(0, 180, 120, 0.15)'; // Use the same color for all completed tasks
    }
    
    if (task.is_shared) {
      return theme.colors.shared + '20'; // Shared tasks with transparency
    } else if (task.assignee_id === session.user.id) {
      return theme.colors.partnerA + '20'; // Current user with transparency
    } else if (task.assignee_id === profile.partner_id) {
      return theme.colors.partnerB + '20'; // Partner with transparency
    }
    return theme.colors.primaryLight;
  }

  // Get the border color for filter tabs
  function getFilterTabBorderColor(filterType: FilterType) {
    if (filterType === 'me') {
      return theme.colors.partnerA; // Current user (Partner A)
    } else if (filterType === 'partner') {
      return theme.colors.partnerB; // Partner B
    } else if (filterType === 'both') {
      return theme.colors.shared; // Shared tasks
    }
    return theme.colors.primary; // Green border for 'all' filter
  }

  const renderTask = ({item}: {item: Task}) => {
    // Check if the task is actually completed but showing in the wrong section
    const isActuallyCompleted = item.status === 'completed';
    
    return (
      <TouchableOpacity
        style={[
          styles.taskCard, 
          isActuallyCompleted && styles.completedTaskCard,
          { borderLeftWidth: 4, borderLeftColor: getAssigneeColor(item) }
        ]}
        onPress={() => navigation.navigate('TaskEdit', {taskId: item.id})}>
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[
              styles.taskTitle,
              isActuallyCompleted && styles.completedTaskText
            ]}>
              {item.title}
            </Text>
          </View>
          
          {item.description && (
            <Text 
              style={[
                styles.taskDescription,
                isActuallyCompleted && styles.completedTaskText
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          
          <View style={styles.taskFooter}>
            <Text style={[
              styles.taskDate,
              isActuallyCompleted && styles.completedTaskText
            ]}>
              Due: {new Date(item.due_date).toLocaleDateString()}
            </Text>
            
            {!isActuallyCompleted ? (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleCompleteTask(item.id)}>
                <Icon name="check-circle-outline" size={18} color={theme.colors.surface} />
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedTag}>
                <Icon name="check-circle" size={16} color={theme.colors.success} />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterTab, 
          { 
            borderColor: getFilterTabBorderColor('all'), 
            borderWidth: 2,
            backgroundColor: activeFilter === 'all' ? theme.colors.primary : theme.colors.surface
          }
        ]}
        onPress={() => setActiveFilter('all')}>
        <Text style={[
          styles.filterText, 
          activeFilter === 'all' && styles.activeFilterText
        ]}>
          All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterTab, 
          { 
            borderColor: getFilterTabBorderColor('me'), 
            borderWidth: 2,
            backgroundColor: activeFilter === 'me' ? theme.colors.partnerA : theme.colors.surface
          }
        ]}
        onPress={() => setActiveFilter('me')}>
        <Text style={[
          styles.filterText, 
          activeFilter === 'me' && { color: theme.colors.surface }
        ]}>
          {profile?.name || 'Me'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterTab, 
          { 
            borderColor: getFilterTabBorderColor('partner'), 
            borderWidth: 2,
            backgroundColor: activeFilter === 'partner' ? theme.colors.partnerB : theme.colors.surface
          }
        ]}
        onPress={() => setActiveFilter('partner')}>
        <Text style={[
          styles.filterText, 
          activeFilter === 'partner' && { color: theme.colors.surface }
        ]}>
          {profile?.partner_name || 'Partner'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterTab, 
          { 
            borderColor: getFilterTabBorderColor('both'), 
            borderWidth: 2,
            backgroundColor: activeFilter === 'both' ? theme.colors.shared : theme.colors.surface
          }
        ]}
        onPress={() => setActiveFilter('both')}>
        <Text style={[
          styles.filterText, 
          activeFilter === 'both' && { color: theme.colors.surface }
        ]}>
          Both
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompletedTasksHeader = () => {
    if (completedTasks.length === 0) return null;
    
    return (
      <View>
        <TouchableOpacity 
          style={styles.completedHeader}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <View style={styles.completedHeaderContent}>
            <Text style={styles.completedHeaderText}>
              Completed ({completedTasks.length})
            </Text>
            <Icon 
              name={showCompleted ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>
        
        {showCompleted && (
          <View>
            {completedTasks.map(task => renderTask({item: task}))}
          </View>
        )}
      </View>
    );
  };

  // Function to test Supabase permissions
  async function testSupabasePermissions() {
    if (!session?.user.id) {
      console.error('No user session found for permission test');
      return;
    }
    
    try {
      console.log('Testing Supabase permissions...');
      
      // Test read permissions
      const {data: readData, error: readError} = await supabase
        .from('priorities')
        .select('id, title, status')
        .limit(1);
        
      if (readError) {
        console.error('Read permission test failed:', readError);
      } else {
        console.log('Read permission test succeeded:', readData);
      }
      
      // Test RLS policies by checking if we can see our own tasks
      const {data: rlsData, error: rlsError} = await supabase
        .from('priorities')
        .select('id, title, status')
        .eq('creator_id', session.user.id)
        .limit(1);
        
      if (rlsError) {
        console.error('RLS policy test failed:', rlsError);
      } else {
        console.log('RLS policy test succeeded:', rlsData);
        
        // If we have a task, test update permissions
        if (rlsData && rlsData.length > 0) {
          const testTaskId = rlsData[0].id;
          const currentStatus = rlsData[0].status;
          
          // Try to update the task with its current status (no actual change)
          console.log('Testing update permission on task:', testTaskId);
          const {data: updateData, error: updateError} = await supabase
            .from('priorities')
            .update({status: currentStatus})
            .eq('id', testTaskId)
            .select();
            
          if (updateError) {
            console.error('Update permission test failed:', updateError);
          } else {
            console.log('Update permission test succeeded:', updateData);
          }
        }
      }
      
    } catch (error) {
      console.error('Permission test error:', error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Priorities</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('TaskCreate')}>
          <Icon name="plus" size={16} color={theme.colors.surface} />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {renderFilterTabs()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeTasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={fetchTasks}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            completedTasks.length > 0 ? (
              <View style={styles.emptyActiveContainer}>
                <Text style={styles.emptyActiveText}>No active priorities</Text>
                <Text style={styles.emptyActiveSubtext}>
                  All your priorities are completed. Great job!
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="heart-outline" size={60} color={theme.colors.primaryLight} />
                <Text style={styles.emptyText}>No priorities yet</Text>
                <Text style={styles.emptySubtext}>
                  Add something important to your relationship
                </Text>
              </View>
            )
          }
          ListFooterComponent={renderCompletedTasksHeader}
        />
      )}
    </SafeAreaView>
  );
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
    fontSize: theme.fontSizes.large,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  activeFilterText: {
    color: theme.colors.surface,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    marginLeft: 5,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completedTaskCard: {
    backgroundColor: theme.colors.surface,
    opacity: 0.8,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  taskDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDate: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  completeButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButtonText: {
    color: theme.colors.surface,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    marginLeft: 5,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    color: theme.colors.success,
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.large,
    color: theme.colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textTertiary,
  },
  contentContainer: {
    flex: 1,
  },
  emptyActiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyActiveText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  emptyActiveSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 40,
  },
  completedHeader: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: theme.colors.background,
  },
  completedHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedHeaderText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
}); 