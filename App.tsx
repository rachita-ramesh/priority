/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import TextProvider from './src/components/TextProvider';

const App = () => {
  return (
    <TextProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </TextProvider>
  );
};

export default App;
