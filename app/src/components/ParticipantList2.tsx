import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';

interface ParticipantListProps {
  participants: string[];
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

const palette = isDarkMode ? darkPalette : lightPalette;

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, onRemove, readonly }) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {participants.map((participant, index) => (
        <View key={index} style={[styles.listItem, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.listItemText, { color: theme.text }]}>{participant}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  listItem: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  listItemText: {
    fontSize: 16,
  },
});

export default ParticipantList;
