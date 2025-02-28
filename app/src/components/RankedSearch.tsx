import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RankedSearchProps {
  isSearching: boolean;
  searchDuration: number;
  isCancelButtonVisible: boolean;
  buttonText: string;
  animatedText: string;
  onPressSearch: () => void;
  onPressCancel: () => void;
  isMatchFound: boolean;
}

const RankedSearch: React.FC<RankedSearchProps> = ({
  isSearching,
  searchDuration,
  isCancelButtonVisible,
  buttonText,
  animatedText,
  onPressSearch,
  onPressCancel,
  isMatchFound,
}) => {
  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={onPressSearch} disabled={isSearching}>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RankedSearch;
