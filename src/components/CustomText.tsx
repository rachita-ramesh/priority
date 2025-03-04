import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface CustomTextProps extends TextProps {
  bold?: boolean;
  medium?: boolean;
}

const CustomText: React.FC<CustomTextProps> = ({ 
  style, 
  children, 
  bold, 
  medium,
  ...props 
}) => {
  let fontFamily = theme.fonts.regular;
  
  if (bold) {
    fontFamily = theme.fonts.bold;
  } else if (medium) {
    fontFamily = theme.fonts.medium;
  }
  
  return (
    <Text 
      style={[{ fontFamily }, style]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export default CustomText; 