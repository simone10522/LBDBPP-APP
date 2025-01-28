import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ParticipantListProps {
  participants: string[];
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, onRemove, readonly }) => {
  return (
    <View style={styles.container}>
      {participants.map((participant, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listItemText}>{participant}</Text>
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
    backgroundColor: 'white',
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
    color: '#333',
  },
});

export default ParticipantList;
