import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import CoreHomeScreen from '../screens/core/CoreHomeScreen';
import GrowthScreen from '../screens/core/GrowthScreen';
import NotesScreen from '../screens/core/NotesScreen';
import CreateNoteScreen from '../screens/core/CreateNoteScreen';
import ReflectionsScreen from '../screens/core/ReflectionsScreen';
import {CoreStackParamList} from './types';
import {theme} from '../theme';

const Stack = createNativeStackNavigator<CoreStackParamList>();

export const CoreNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}>
      <Stack.Screen name="CoreHome" component={CoreHomeScreen} />
      <Stack.Screen name="Growth" component={GrowthScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="CreateNote" component={CreateNoteScreen} />
      <Stack.Screen name="Reflections" component={ReflectionsScreen} />
    </Stack.Navigator>
  );
}; 