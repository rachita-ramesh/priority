import React, { ReactNode } from 'react';
import { Text, TextInput } from 'react-native';
import { theme } from '../theme';

interface TextProviderProps {
  children: ReactNode;
}

// Apply default font styling to all Text components
const setDefaultTextStyle = () => {
  // @ts-ignore - TypeScript doesn't recognize defaultProps on Text
  if (Text.defaultProps === undefined) {
    // @ts-ignore
    Text.defaultProps = {};
  }
  // @ts-ignore
  Text.defaultProps.style = {
    fontFamily: theme.fonts.regular,
    // @ts-ignore
    ...(Text.defaultProps?.style || {}),
  };

  // @ts-ignore - TypeScript doesn't recognize defaultProps on TextInput
  if (TextInput.defaultProps === undefined) {
    // @ts-ignore
    TextInput.defaultProps = {};
  }
  // @ts-ignore
  TextInput.defaultProps.style = {
    fontFamily: theme.fonts.regular,
    // @ts-ignore
    ...(TextInput.defaultProps?.style || {}),
  };
};

// Call the function to set default styles
setDefaultTextStyle();

const TextProvider: React.FC<TextProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export default TextProvider; 