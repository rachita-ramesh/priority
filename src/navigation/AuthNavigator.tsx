import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import NameSetupScreen from '../screens/auth/NameSetupScreen';
import PartnerCodeScreen from '../screens/auth/PartnerCodeScreen';
import {MainNavigator} from './MainNavigator';
import {AuthStackParamList} from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  initialRouteName?: keyof AuthStackParamList;
};

export const AuthNavigator = ({ initialRouteName = 'Login' }: AuthNavigatorProps) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="NameSetup" component={NameSetupScreen} />
      <Stack.Screen name="PartnerCode" component={PartnerCodeScreen} />
      <Stack.Screen name="MainTabs" component={MainNavigator} />
    </Stack.Navigator>
  );
}; 