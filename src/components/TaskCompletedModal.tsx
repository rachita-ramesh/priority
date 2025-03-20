import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TaskCompletedModalProps {
  visible: boolean;
  onClose: () => void;
  isShared?: boolean;
  partnerName?: string;
}

const TaskCompletedModal: React.FC<TaskCompletedModalProps> = ({
  visible,
  onClose,
  isShared = false,
  partnerName = 'Your partner',
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      spinAnim.setValue(0);
      
      // Run entrance animations
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              <View style={styles.modalHeader}>
                <Animated.View style={[styles.iconCircle, { transform: [{ rotate: spin }] }]}>
                  <Icon name="check" size={36} color="#fff" />
                </Animated.View>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.headerText}>
                  Task Completed!
                </Text>
                <Text style={styles.subheaderText}>
                  {partnerName} appreciates this.
                </Text>
                <View style={styles.pointsContainer}>
                  <Icon name="star" size={22} color={theme.colors.primary} />
                  <Text style={styles.pointsText}>
                    {isShared ? 'You both earned one point' : 'You earned one point'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.button}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
  },
  iconCircle: {
    backgroundColor: theme.colors.success,
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalContent: {
    padding: 24,
    paddingTop: 5,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheaderText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  pointsText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
    marginHorizontal: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontSizes.regular,
    color: '#FFFFFF',
  },
});

export default TaskCompletedModal; 