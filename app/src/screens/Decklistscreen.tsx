import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import Icon

const Decklistscreen = () => {
  const { isDarkMode, user } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const navigation = useNavigation();
  const [deckCount, setDeckCount] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckList, setDeckList] = useState(null);
  const [isDeckListVisible, setIsDeckListVisible] = useState(false);
  const [deckNames, setDeckNames] = useState({}); // Store deck names

  useEffect(() => {
    fetchDeckCount();
    fetchDeckNames();
  }, [user]);

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

  const fetchDeckNames = async () => {
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

      const names = {};
      for (let i = 1; i <= 10; i++) {
        if (profile && profile[`DECK_LIST_${i}`]) {
          const deckData = JSON.parse(profile[`DECK_LIST_${i}`]);
          names[i] = deckData.name;
        }
      }
      setDeckNames(names);
    } catch (error) {
      console.error("Error fetching deck names:", error);
    }
  };

  const handleAddDeck = () => {
    navigation.navigate('MyDecks');
  };

  const handleDeckPress = async (deckNumber) => {
    if (selectedDeck === deckNumber && isDeckListVisible) {
      setIsDeckListVisible(false);
      return;
    }

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
        const cardCounts = {};
        deck.cards.forEach(card => {
          cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
        });

        const countedDeckList = Object.entries(cardCounts).map(([name, quantity]) => ({
          name,
          quantity
        }));

        setDeckList(countedDeckList);
        setIsDeckListVisible(true);
      } else {
        setDeckList(null);
        setIsDeckListVisible(false);
      }
    } catch (error) {
      console.error("Error parsing deck list:", error);
      setIsDeckListVisible(false);
    }
  };

  const handleDeleteDeck = async (deckNumber) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete ${deckNames[deckNumber] || `Deck #${deckNumber}`}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            if (!user) return;
            try {
              const updates = { [`DECK_LIST_${deckNumber}`]: null };
              const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

              if (error) {
                console.error("Error deleting deck:", error);
                Alert.alert("Error", "Failed to delete the deck.");
                return;
              }
              await fetchDeckCount();
              await fetchDeckNames();
              setSelectedDeck(null);
              setIsDeckListVisible(false);
              Alert.alert("Success", `${deckNames[deckNumber] || `Deck #${deckNumber}`} has been deleted.`);
            } catch (error) {
              console.error("Error deleting deck:", error);
              Alert.alert("Error", "An unexpected error occurred.");
            }
          }
        }
      ]
    );
  };

    const handleEditDeck = (deckNumber) => {
        // Navigate to MyDecksScreen and pass the deckNumber as a parameter
        navigation.navigate('MyDecks', { deckNumber: deckNumber });
    };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>My Deck Lists</Text>
      {deckCount > 0 &&
        Array.from({ length: deckCount }, (_, i) => i + 1).map((deckNumber) => (
          <View key={deckNumber} style={styles.deckRow}>
            <TouchableOpacity
              style={[
                styles.deckNumberContainer,
                { backgroundColor: theme.primary },
                selectedDeck === deckNumber ? styles.selectedDeck : null,
              ]}
              onPress={() => handleDeckPress(deckNumber)}
            >
              <Text style={[styles.deckNumberText, { color: theme.text }]}>
                {deckNames[deckNumber] || `Deck #${deckNumber}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditDeck(deckNumber)}
            >
              <Icon name="pencil" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteDeck(deckNumber)}
            >
              <Text style={styles.deleteButtonText}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
      <TouchableOpacity style={styles.addButton} onPress={handleAddDeck}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {selectedDeck && deckList && isDeckListVisible && (
        <View style={styles.deckListContainer}>
          <Text style={[styles.deckListTitle, { color: theme.text }]}>
            {deckNames[selectedDeck] || `Deck #${selectedDeck}`} List:
          </Text>
          <ScrollView>
            {deckList.map((card, index) => (
              <Text key={index} style={[styles.cardText, { color: theme.text }]}>
                {card.name} {card.quantity > 1 ? `X${card.quantity}` : ''}
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
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  deckNumberContainer: {
    backgroundColor: '#5DADE2',
    padding: 10,
    borderRadius: 5,
    flex: 1,
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
    editButton: {
    backgroundColor: 'blue', // Different color for edit
    marginLeft: 10,
    padding: 10,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: 'red',
    marginLeft: 10,
    padding: 10,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default Decklistscreen;
