import React, { useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native'; // Assuming you have lucide-react-native installed
import { lightPalette, darkPalette } from '../context/themes'; // Import lightPalette and darkPalette
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
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <TouchableOpacity onPress={toggleAccordion} style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <ChevronDown
          size={24}
          color={theme.text}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      <View style={[styles.content, { display: expanded ? 'flex' : 'none' }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderRadius: 5,
    overflow: 'hidden', // Ensures the content respects the border radius
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    // Removed height: 0 and overflow: hidden
    // overflow: 'hidden', // Keep this if you want to clip content that exceeds the container
    padding: 10, // Add some padding to the content
  },
});

export default Accordion;
