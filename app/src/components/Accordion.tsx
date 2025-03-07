import React, { useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';

interface AccordionProps {
  title: string;
  children: ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
  const { isDarkMode } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const theme = isDarkMode ? darkPalette : lightPalette;

  const toggleAccordion = () => {
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderColor }]}>
      <Pressable onPress={toggleAccordion} style={({ pressed }) => [
        styles.header,
        { backgroundColor: pressed ? theme.secondary : 'transparent' }
      ]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <ChevronDown
          size={20}
          color={theme.text}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      <View style={[styles.content, { display: expanded ? 'flex' : 'none' }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginBottom: 0, // Remove margin, handle in parent
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 14, // Slightly smaller font
    fontWeight: '500', // Less bold
  },
  content: {
    padding: 10,
  },
});

export default Accordion;
