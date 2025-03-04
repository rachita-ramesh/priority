import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TasksNavigator} from './TasksNavigator';
import SettingsScreen from '../screens/main/SettingsScreen';
import {MainStackParamList} from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {theme} from '../theme';

const Tab = createBottomTabNavigator<MainStackParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 12,
        },
        headerShown: false,
      }}>
      <Tab.Screen 
        name="TasksTab" 
        component={TasksNavigator}
        options={{
          title: 'Priorities',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}; 