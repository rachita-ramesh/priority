import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CoreStackParamList} from '../../navigation/types';
import {supabase} from '../../lib/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import {theme} from '../../theme';

const {width} = Dimensions.get('window');

type Note = {
  id: string;
  content: string;
  created_at: string;
};

const NotesScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<CoreStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      
      // Query Supabase for notes
      const {data, error} = await supabase
        .from('partner_notes')
        .select('*')
        .order('created_at', {ascending: false});
        
      if (error) throw error;
      
      if (data) {
        setNotes(data as Note[]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Use placeholder data if table doesn't exist yet
      setNotes([
        {
          id: '1',
          content: 'Remember to ask about their presentation at work',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          content: "Don't forget their mom's birthday next week",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [])
  );

  const handleDeleteNote = async (id: string) => {
    try {
      // Optimistically remove from UI
      setNotes(notes.filter(note => note.id !== id));
      
      // Delete from database
      const {error} = await supabase
        .from('partner_notes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting note:', error);
      // Restore notes on error
      fetchNotes();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is today
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // Check if date is yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // For older dates, return formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="document-text-outline" size={48} color={theme.colors.primary} />
      </View>
      <Text style={styles.emptyStateTitle}>
        Your notes collection is empty
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        Capture important details, preferences, and memorable moments about your partner
      </Text>
      <TouchableOpacity
        style={styles.createButtonEmpty}
        onPress={() => navigation.navigate('CreateNote', { noteId: undefined })}>
        <Text style={styles.createButtonText}>Create first note</Text>
        <Icon name="add-circle" size={18} color="#fff" style={{marginLeft: 8}} />
      </TouchableOpacity>
    </View>
  );

  const renderNoteCard = (note: Note) => (
    <View key={note.id} style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.dateChip}>
          <Icon name="time-outline" size={12} color={theme.colors.primary} style={styles.dateIcon} />
          <Text style={styles.noteDate}>{formatDate(note.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('CreateNote', { noteId: note.id })}>
          <Icon name="pencil" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.noteText}>{note.content}</Text>
      
      <View style={styles.noteFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteNote(note.id)}>
          <Icon name="trash-outline" size={16} color={theme.colors.error} />
          <Text style={[styles.actionButtonText, {color: theme.colors.error}]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Notes</Text>
        {notes.length > 0 ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateNote', { noteId: undefined })}>
            <Icon name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{width: 50}} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your notes...</Text>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={notes.length === 0 ? styles.emptyScrollContent : styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            
            {notes.length === 0 ? (
              renderEmptyState()
            ) : (
              <View style={styles.notesGrid}>
                {notes.map(note => renderNoteCard(note))}
              </View>
            )}
          </ScrollView>
          
          {notes.length > 0 && (
            <TouchableOpacity
              style={styles.floatingActionButton}
              onPress={() => navigation.navigate('CreateNote', { noteId: undefined })}>
              <Icon name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  notesGrid: {
    flexDirection: 'column',
    width: '100%',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 170, 126, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateIcon: {
    marginRight: 4,
  },
  noteDate: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  noteText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    padding: 16,
    paddingTop: 8,
    fontFamily: theme.fonts.regular,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  actionButtonText: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily: theme.fonts.medium,
  },
  editButton: {
    padding: 8,
    borderRadius: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0, 170, 126, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    marginBottom: 12,
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  createButtonEmpty: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    width: width * 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: theme.fonts.bold,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default NotesScreen; 