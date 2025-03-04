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
  const [userName, setUserName] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');

  useEffect(() => {
    fetchTasks();
    if (profile) {
      const myName = profile.name || 'Me';
      const theirName = profile.partner_name || 'Partner';
      
      console.log('Setting user names:', { myName, theirName });
      setUserName(myName);
      setPartnerName(theirName);
    }
    
    // Add a focus listener to refresh tasks when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('TasksList screen focused, refreshing tasks');
      fetchTasks();
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

      // Fetch all tasks where the user is either the creator, assignee, or the task is shared
      const {data, error} = await supabase
        .from('priorities')
        .select('*')
        .or(`creator_id.eq.${session.user.id},assignee_id.eq.${session.user.id},is_shared.eq.true`)
        .order('due_date', {ascending: true});

      if (error) {
        throw error;
      }

      console.log('Tasks fetched:', data);
      setTasks(data || []);
      filterTasks(activeFilter);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function filterTasks(filterType: FilterType) {
    if (!profile || !session) return;
    
    console.log('Filtering tasks by:', filterType);
    console.log('Available tasks:', tasks);
    
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
      
      const {error} = await supabase
        .from('priorities')
        .update({status: 'completed'})
        .eq('id', taskId);

      if (error) throw error;
      
      // Update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? {...task, status: 'completed' as const} : task
      );
      setTasks(updatedTasks);
      
      // Add points for completing task (the function will check due date and show appropriate alerts)
      await addPointsForTask(taskId);
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
              'Task Completed',
              'Task completed successfully! You and your partner each earned 1 point.'
            );
          } else {
            Alert.alert(
              'Task Completed',
              'Task completed successfully! You earned 1 point.'
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
              'Task Completed',
              isSharedTask 
                ? 'Task completed! You earned 1 point, but there was an error awarding points to your partner.'
                : 'Task completed! You earned 1 point.'
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
    
    const userName = session.user.user_metadata?.name || 'Me';
    const partnerName = profile.partner?.name || 'Partner';
    
    console.log('Getting assignee label for task:', {
      taskId: task.id,
      assigneeId: task.assignee_id,
      userId: session.user.id,
      partnerId: profile.partner_id,
      userName,
      partnerName,
      isShared: task.is_shared
    });
    
    if (task.is_shared) {
      return 'Both';
    } else if (task.assignee_id === session.user.id) {
      return userName;
    } else if (task.assignee_id === profile.partner_id) {
      return partnerName;
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

  const renderTask = ({item}: {item: Task}) => (
    <TouchableOpacity
      style={[
        styles.taskCard, 
        item.status === 'completed' && styles.completedTaskCard,
        { borderLeftWidth: 4, borderLeftColor: getAssigneeColor(item) }
      ]}
      onPress={() => navigation.navigate('TaskEdit', {taskId: item.id})}>
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[
            styles.taskTitle,
            item.status === 'completed' && styles.completedTaskText
          ]}>
            {item.title}
          </Text>
        </View>
        
        {item.description && (
          <Text 
            style={[
              styles.taskDescription,
              item.status === 'completed' && styles.completedTaskText
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
        
        <View style={styles.taskFooter}>
          <Text style={[
            styles.taskDate,
            item.status === 'completed' && styles.completedTaskText
          ]}>
            Due: {new Date(item.due_date).toLocaleDateString()}
          </Text>
          
          {item.status === 'pending' ? (
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
          {userName}
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
          {partnerName}
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
            completedTasks.length > 0 || activeFilter !== 'all' ? (
              <View style={styles.emptyActiveContainer}>
                <Text style={styles.emptyActiveText}>No active priorities</Text>
                <Text style={styles.emptyActiveSubtext}>
                  {completedTasks.length > 0 
                    ? 'All your priorities are completed. Great job!' 
                    : activeFilter === 'me' 
                      ? `No active priorities for ${userName}`
                      : activeFilter === 'partner' 
                        ? `No active priorities for ${partnerName}`
                        : activeFilter === 'both'
                          ? 'No shared priorities yet'
                          : 'No active priorities found'}
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
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.xlarge,
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