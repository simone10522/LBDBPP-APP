import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';

interface SearchAndTimerProps {
  onSearchStart: () => void;
  onSearchCancel: () => void;
  isSearching: boolean;
  matchFound: boolean;
  time: number;
}

const SearchAndTimer: React.FC<SearchAndTimerProps> = ({
  onSearchStart,
  onSearchCancel,
  isSearching,
  matchFound,
  time,
}) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;

  return (
    <View style={styles.container}>
      {!isSearching && !matchFound && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.buttonBackground, borderColor: theme.buttonBorder }]}
          onPress={onSearchStart}
          disabled={isSearching}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Ricerca Classificata
          </Text>
        </TouchableOpacity>
      )}

      {isSearching && !matchFound && (
        <View style={styles.searchingContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>
            Tempo di ricerca: {time}s
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.errorButtonBackground, borderColor: theme.errorButtonBorder }]}
            onPress={onSearchCancel}
          >
            <Text style={[styles.cancelButtonText, { color: theme.errorButtonText }]}>
              Annulla
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchingContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    marginBottom: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SearchAndTimer;
