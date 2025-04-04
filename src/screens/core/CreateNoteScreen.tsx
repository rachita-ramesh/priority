import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CoreStackParamList} from '../../navigation/types';
import {supabase} from '../../lib/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import {theme} from '../../theme';

type Props = NativeStackScreenProps<CoreStackParamList, 'CreateNote'>;

export default function CreateNoteScreen({navigation}: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateNote = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      setLoading(true);
      
      const newNote = {
        content: content.trim(),
        created_at: new Date().toISOString(),
      };
      
      const {error} = await supabase
        .from('partner_notes')
        .insert(newNote);
        
      if (error) throw error;
      
      navigation.goBack();
    } catch (error) {
      console.error('Error creating note:', error);
      Alert.alert('Error', 'Could not save your note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.dismissOverlay}
          onPress={() => navigation.goBack()}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>New Note</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Capture important details about your partner
            </Text>

            <TextInput
              style={styles.input}
              multiline
              placeholder="Write reminders, preferences, or important dates..."
              placeholderTextColor={theme.colors.textTertiary}
              value={content}
              onChangeText={setContent}
              maxLength={500}
              autoFocus
            />

            <View style={styles.counter}>
              <Text style={styles.counterText}>{content.length}/500</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                !content.trim() && styles.buttonDisabled,
              ]}
              onPress={handleCreateNote}
              disabled={!content.trim() || loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save Note</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  closeButton: {
    padding: 5,
  },
  label: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    fontFamily: theme.fonts.regular,
  },
  input: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 10,
    textAlignVertical: 'top',
    fontFamily: theme.fonts.regular,
  },
  counter: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  counterText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontFamily: theme.fonts.regular,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 30,
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
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: theme.fonts.medium,
  },
}); 