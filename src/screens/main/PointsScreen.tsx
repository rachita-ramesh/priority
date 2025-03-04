import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../hooks/useAuth';
import {theme} from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type PointsHistory = {
  id: string;
  priority_id: string;
  points: number;
  created_at: string;
  user_id: string;
  priorities: {
    title: string;
    due_date?: string;
    assignee_id?: string;
    is_shared?: boolean;
  };
};

type PointsFilter = 'all' | 'mine' | 'partner' | 'shared';

export default function PointsScreen() {
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PointsHistory[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [myPoints, setMyPoints] = useState(0);
  const [partnerPoints, setPartnerPoints] = useState(0);
  const [sharedPoints, setSharedPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PointsFilter>('all');
  const {session, profile} = useAuth();

  useEffect(() => {
    fetchPointsHistory();
  }, []);

  useEffect(() => {
    if (pointsHistory.length > 0) {
      filterPointsHistory(activeFilter);
    }
  }, [pointsHistory, activeFilter]);

  async function fetchPointsHistory() {
    try {
      setLoading(true);
      if (!session?.user?.id) {
        console.error('No user session found');
        return;
      }

      console.log('Fetching points history for user:', session.user.id);
      
      const {data, error} = await supabase
        .from('points_history')
        .select('*, priorities(title, due_date, assignee_id, is_shared)')
        .eq('user_id', session.user.id)
        .order('created_at', {ascending: false});

      if (error) {
        console.error('Error fetching points history:', error);
        throw error;
      }

      console.log('Points history data received:', data);
      
      setPointsHistory(data);
      calculatePoints(data);
    } catch (error: any) {
      console.error('Error in fetchPointsHistory:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function calculatePoints(history: PointsHistory[]) {
    if (!session?.user?.id) return;

    const total = history.reduce((sum, item) => sum + item.points, 0);
    
    // Calculate points by category
    let myPointsTotal = 0;
    let partnerPointsTotal = 0;
    let sharedPointsTotal = 0;

    history.forEach(item => {
      // Check if this is a shared task
      const isSharedTask = item.priorities.is_shared;
      
      if (isSharedTask) {
        sharedPointsTotal += item.points;
      } else if (item.user_id === session.user.id) {
        myPointsTotal += item.points;
      } else {
        partnerPointsTotal += item.points;
      }
    });

    setTotalPoints(total);
    setMyPoints(myPointsTotal);
    setPartnerPoints(partnerPointsTotal);
    setSharedPoints(sharedPointsTotal);
  }

  function filterPointsHistory(filter: PointsFilter) {
    if (!session?.user?.id) return;

    let filtered: PointsHistory[];

    switch (filter) {
      case 'mine':
        filtered = pointsHistory.filter(item => {
          const isSharedTask = item.priorities.is_shared;
          return !isSharedTask && item.user_id === session.user.id;
        });
        break;
      case 'partner':
        filtered = pointsHistory.filter(item => {
          const isSharedTask = item.priorities.is_shared;
          return !isSharedTask && item.user_id !== session.user.id;
        });
        break;
      case 'shared':
        filtered = pointsHistory.filter(item => {
          const isSharedTask = item.priorities.is_shared;
          return isSharedTask;
        });
        break;
      case 'all':
      default:
        filtered = pointsHistory;
        break;
    }

    setFilteredHistory(filtered);
  }

  const getPointsTypeLabel = (item: PointsHistory) => {
    if (!session?.user?.id) return '';

    const isSharedTask = item.priorities.is_shared;

    if (isSharedTask) {
      return 'Shared Task';
    } else if (item.user_id === session.user.id) {
      return 'My Task';
    } else {
      return 'Partner Task';
    }
  };

  const getPointsTypeColor = (item: PointsHistory) => {
    if (!session?.user?.id) return theme.colors.primary;
    
    const isSharedTask = item.priorities.is_shared;
                        
    if (isSharedTask) {
      return theme.colors.success;
    } else if (item.user_id !== session.user.id) {
      return theme.colors.partnerB;
    } else {
      return theme.colors.primary;
    }
  };

  const renderPointsItem = ({item}: {item: PointsHistory}) => {
    // Check if the task was completed on time by comparing creation date with due date
    const completedDate = new Date(item.created_at);
    const dueDate = item.priorities.due_date ? new Date(item.priorities.due_date) : null;
    const completedOnTime = dueDate ? completedDate <= dueDate : true;
    
    return (
      <View style={styles.pointsCard}>
        <View style={styles.pointsContent}>
          <Text style={styles.taskTitle}>{item.priorities.title}</Text>
          <View style={styles.pointsDetails}>
            <Text style={styles.pointsDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <View
              style={[
                styles.typeTag,
                {backgroundColor: getPointsTypeColor(item) + '20'},
              ]}>
              <Text
                style={[
                  styles.typeText,
                  {color: getPointsTypeColor(item)},
                ]}>
                {getPointsTypeLabel(item)}
              </Text>
            </View>
            {completedOnTime && (
              <View style={styles.onTimeTag}>
                <Text style={styles.onTimeText}>On Time</Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={[
            styles.pointsBadge,
            {backgroundColor: getPointsTypeColor(item)},
          ]}>
          <Text style={styles.pointsText}>+{item.points}</Text>
        </View>
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeFilter === 'all' && styles.activeFilterTab,
        ]}
        onPress={() => setActiveFilter('all')}>
        <Text
          style={[
            styles.filterText,
            activeFilter === 'all' && styles.activeFilterText,
          ]}>
          All
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeFilter === 'mine' && styles.activeFilterTab,
        ]}
        onPress={() => setActiveFilter('mine')}>
        <Text
          style={[
            styles.filterText,
            activeFilter === 'mine' && styles.activeFilterText,
          ]}>
          My Tasks
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeFilter === 'partner' && styles.activeFilterTab,
        ]}
        onPress={() => setActiveFilter('partner')}>
        <Text
          style={[
            styles.filterText,
            activeFilter === 'partner' && styles.activeFilterText,
          ]}>
          Partner
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterTab,
          activeFilter === 'shared' && styles.activeFilterTab,
        ]}
        onPress={() => setActiveFilter('shared')}>
        <Text
          style={[
            styles.filterText,
            activeFilter === 'shared' && styles.activeFilterText,
          ]}>
          Shared
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPointsSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Points</Text>
        <Text style={styles.summaryValue}>{totalPoints}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardSmall]}>
          <Text style={styles.summaryLabel}>My Tasks</Text>
          <Text style={styles.summaryValue}>{myPoints}</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.summaryCardSmall]}>
          <Text style={styles.summaryLabel}>Shared</Text>
          <Text style={styles.summaryValue}>{sharedPoints}</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.summaryCardSmall]}>
          <Text style={styles.summaryLabel}>Partner</Text>
          <Text style={styles.summaryValue}>{partnerPoints}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Points</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchPointsHistory}
        >
          <Icon name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {renderPointsSummary()}
      
      {renderFilterTabs()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderPointsItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No points earned yet</Text>
              <Text style={styles.emptySubtext}>
                Complete tasks to earn points
              </Text>
            </View>
          }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginRight: 10,
  },
  refreshButton: {
    padding: 8,
  },
  totalPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 12,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalPointsLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginRight: 10,
  },
  totalPointsValue: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontSizes.large,
    color: theme.colors.primary,
  },
  summaryContainer: {
    margin: 20,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryCardSmall: {
    flex: 1,
    marginBottom: 0,
    padding: 12,
  },
  summaryLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  summaryValue: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: theme.colors.primary,
  },
  filterText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  activeFilterText: {
    color: theme.colors.primary,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  pointsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pointsContent: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  pointsDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pointsDate: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
  },
  pointsBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.surface,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.large,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textTertiary,
  },
  onTimeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onTimeText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.small,
    color: theme.colors.success,
  },
}); 