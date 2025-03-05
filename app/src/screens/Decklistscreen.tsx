import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const Decklistscreen = () => {
  const { isDarkMode, user } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const navigation = useNavigation();
  const [deckCount, setDeckCount] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckList, setDeckList] = useState(null);

  useEffect(() => {
    const fetchDeckCount = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        let count = 0;
        for (let i = 1; i <= 10; i++) {
          if (profile && profile[`DECK_LIST_${i}`]) {
            count++;
          }
        }
        setDeckCount(count);
      } catch (error) {
        console.error("Error fetching deck count:", error);
      }
    };

    fetchDeckCount();
  }, [user]);

  const handleAddDeck = () => {
    navigation.navigate('MyDecks');
  };

  const handleDeckPress = async (deckNumber) => {
    setSelectedDeck(deckNumber);
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`DECK_LIST_${deckNumber}`)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching deck list:", error);
        return;
      }

      if (profile && profile[`DECK_LIST_${deckNumber}`]) {
        const deck = JSON.parse(profile[`DECK_LIST_${deckNumber}`]);
        setDeckList(deck);
      } else {
        setDeckList(null);
      }
    } catch (error) {
      console.error("Error parsing deck list:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>My Deck Lists</Text>
      {deckCount > 0 &&
        Array.from({ length: deckCount }, (_, i) => i + 1).map((deckNumber) => (
          <TouchableOpacity
            key={deckNumber}
            style={[
              styles.deckNumberContainer,
              { backgroundColor: theme.primary },
              selectedDeck === deckNumber ? styles.selectedDeck : null,
            ]}
            onPress={() => handleDeckPress(deckNumber)}
          >
            <Text style={[styles.deckNumberText, { color: theme.text }]}>Deck #{deckNumber}</Text>
          </TouchableOpacity>
        ))}
      <TouchableOpacity style={styles.addButton} onPress={handleAddDeck}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {selectedDeck && deckList && (
        <View style={styles.deckListContainer}>
          <Text style={[styles.deckListTitle, { color: theme.text }]}>Deck #{selectedDeck} List:</Text>
          <ScrollView>
            {deckList.map((card, index) => (
              <Text key={index} style={[styles.cardText, { color: theme.text }]}>
                {card.name}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deckNumberContainer: {
    backgroundColor: '#5DADE2',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
  },
  deckNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#5DADE2',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  selectedDeck: {
    borderWidth: 2,
    borderColor: 'yellow',
  },
  deckListContainer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  deckListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
  },
});

export default Decklistscreen;
