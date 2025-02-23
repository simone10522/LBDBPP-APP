import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RankedSearchProps {
  isSearching: boolean;
  searchDuration: number;
  isCancelButtonVisible: boolean;
  buttonText: string;
  animatedText: string;
  onPressSearch: () => void;
  onPressCancel: () => void;
  isMatchFound: boolean; // Add isMatchFound prop
}

const RankedSearch: React.FC<RankedSearchProps> = ({
  isSearching,
  searchDuration,
  isCancelButtonVisible,
  buttonText,
  animatedText,
  onPressSearch,
  onPressCancel,
  isMatchFound, // Receive isMatchFound prop
}) => {
  return (
    <View>
      {isMatchFound ? null : (
        <TouchableOpacity style={styles.button} onPress={onPressSearch} disabled={isSearching}>
          {!isSearching ? <Text style={styles.buttonText}>{buttonText}</Text> : null}
        </TouchableOpacity>
      )}
      {isSearching && (
        <View style={styles.searchInfoContainer}>
          <Text style={[styles.searchText, { color: 'red', fontSize: 20, fontWeight: 'bold' }]}>{animatedText}</Text>
          <Text style={[styles.searchText, { color: 'red', fontSize: 20, fontWeight: 'bold' }]}>Tempo di ricerca: {searchDuration} secondi</Text>
          {isCancelButtonVisible && (
            <TouchableOpacity style={styles.cancelButton} onPress={onPressCancel}>
              <Text style={styles.cancelButtonText}>Annulla Ricerca</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInfoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  searchText: {
    fontSize: 16,
    marginBottom: 10,
    color: 'grey',
  },
});

export default RankedSearch;
