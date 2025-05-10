import React, { useState, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, TextStyle, Animated, Easing, Platform, UIManager } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import CountryFlag from "react-native-country-flag";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionProps {
  title: string;
  children: ReactNode;
  flags?: { code: string; isoCode: string }[];
  showStatusIndicator?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  status?: string;
  onOpen?: () => void;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  flags = [],
  showStatusIndicator = false,
  titleStyle,
  status,
  onOpen
}) => {
  const { isDarkMode } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const contentRef = useRef(null);
  const theme = isDarkMode ? darkPalette : lightPalette;

  const toggleAccordion = () => {
    const isExpanding = !expanded;
    setExpanded(isExpanding);
    
    Animated.timing(animation, {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();

    if (isExpanding && onOpen) {
      onOpen();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'green';
      case 'offline':
        return 'red';
      default:
        return 'gray';
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
        <Text style={[styles.title, { color: theme.text }, titleStyle]}>{title}</Text>
        <Animated.View
          style={{
            transform: [{
              rotate: animation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg']
              })
            }]
          }}
        >
          <ChevronDown size={20} color={theme.text} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.content,
          expanded
            ? { opacity: animation }
            : {
                maxHeight: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1000]
                }),
                opacity: animation,
                overflow: 'hidden'
              }
        ]}
      >
        <View style={styles.flagsContainer}>
          {flags.map((flag) => (
            <CountryFlag key={flag.code} isoCode={flag.isoCode} size={25} style={{ marginRight: 5 }} />
          ))}
        </View>
        {children}
      </Animated.View>
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
    padding: 0,
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
