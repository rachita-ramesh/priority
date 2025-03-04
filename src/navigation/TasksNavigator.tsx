import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TasksListScreen from '../screens/main/TasksListScreen';
import TaskCreateScreen from '../screens/main/TaskCreateScreen';
import TaskEditScreen from '../screens/main/TaskEditScreen';
import {TasksStackParamList} from './types';

const Stack = createNativeStackNavigator<TasksStackParamList>();

export const TasksNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="TasksList" component={TasksListScreen} />
      <Stack.Screen 
        name="TaskCreate" 
        component={TaskCreateScreen}
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
      <Stack.Screen name="TaskEdit" component={TaskEditScreen} />
    </Stack.Navigator>
  );
}; 