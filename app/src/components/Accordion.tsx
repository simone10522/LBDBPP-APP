import React, { useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, StyleProp, TextStyle } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import CountryFlag from "react-native-country-flag";

interface AccordionProps {
  title: string;
  children: ReactNode;
  flags?: { code: string; isoCode: string }[];
  showStatusIndicator?: boolean;
  titleStyle?: StyleProp<TextStyle>; // Add titleStyle prop
  status?: string;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, flags = [], showStatusIndicator = false, titleStyle, status }) => {
  const { isDarkMode } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const theme = isDarkMode ? darkPalette : lightPalette;

  const toggleAccordion = () => {
    setExpanded(!expanded);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'green';
      case 'offline':
        return 'red';
      default:
        return 'gray'; // Default color if status is unknown
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderColor }]}>
      <Pressable
        onPress={toggleAccordion}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? theme.secondary : 'transparent' },
        ]}
      >
        {showStatusIndicator && (
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        )}
        <Text style={[styles.title, { color: theme.text }, titleStyle]} >{title}</Text>
        <ChevronDown
          size={20}
          color={theme.text}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      <View style={[styles.content, { display: expanded ? 'flex' : 'none' }]}>
        <View style={styles.flagsContainer}>
          {flags.map((flag) => (
            <CountryFlag key={flag.code} isoCode={flag.isoCode} size={25} style={{ marginRight: 5 }} />
          ))}
        </View>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  content: {
    padding: 10,
  },
  flagsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    marginLeft: 5
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 0,
  },
});

export default Accordion;
