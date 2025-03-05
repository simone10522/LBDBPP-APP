import React, { useState, useEffect } from 'react';
    import { View, Text, StyleSheet, ScrollView, Image, TextInput, Modal, TouchableOpacity, Animated } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { lightPalette, darkPalette } from '../context/themes';
    import { useAuth } from '../hooks/useAuth';
    import AsyncStorage from '@react-native-async-storage/async-storage';
    import { supabase } from '../lib/supabase';
    import { useNavigation } from '@react-navigation/native'; // Import useNavigation

    const MyDecksScreen = () => {
      const [setsData, setSetsData] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [searchText, setSearchText] = useState('');
      const [isModalVisible, setIsModalVisible] = useState(false);
      const [selectedCard, setSelectedCard] = useState(null);
      const [animatedValue] = useState(new Animated.Value(0));
      const [currentDeck, setCurrentDeck] = useState([]);
      const [deckError, setDeckError] = useState(null);
      const [isDeckFull, setIsDeckFull] = useState(false); // New state variable

      const { isDarkMode, user } = useAuth();
      const currentPalette = isDarkMode ? darkPalette : lightPalette;
      const navigation = useNavigation(); // Initialize navigation

      useEffect(() => {
        fetchCardSets();
      }, []);

      const fetchCardSets = async () => {
        setLoading(true);
        setError(null);
        try {
          const cacheKey = 'cardSetsCache';
          const cachedData = await AsyncStorage.getItem(cacheKey);
          const now = Date.now();

          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            // Invalidate cache after 24 hours (86400000 milliseconds)
            if (now - timestamp < 86400000) {
              setSetsData(data);
              setLoading(false);
              return;
            }
          }

          const setIds = ['A1', 'A2', 'A1a', 'A2a', 'P-A'];
          const fetchedSets = [];

          for (const setId of setIds) {
            const url = `https://api.tcgdex.net/v2/en/sets/${setId}`;
            console.log('Fetching URL:', url);

            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const setData = await response.json();
            const cardsData = setData?.cards || [];

            console.log('Initial cardsData length:', cardsData.length);

            let filteredCards = cardsData;

            console.log('searchText:', searchText);

            if (searchText) {
              filteredCards = filteredCards.filter(card =>
                card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
              );
              console.log('filteredCards length after searchText:', filteredCards.length);
            }

            if (filteredCards.length > 0) {
              const setWithCachedImages = {
                setName: setData.name,
                cards: filteredCards.map(card => ({
                  ...card,
                  cachedImage: `${card.image}/low.webp`,
                })),
              };
              fetchedSets.push(setWithCachedImages);
            }
          }
          setSetsData(fetchedSets);
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: fetchedSets, timestamp: now }));

        } catch (err) {
          console.error("Error fetching cards:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchCardSets();
      }, [searchText]);

      const handleCardPress = (card) => {
        setDeckError(null);
        if (currentDeck.length >= 20) {
          setDeckError("Deck cannot exceed 20 cards.");
          return;
        }

        const cardCount = currentDeck.filter((c) => c.name === card.name).length;
        if (cardCount >= 2) {
          setDeckError("Cannot have more than two copies of the same card.");
          return;
        }

        const newDeck = [...currentDeck, card];
        setCurrentDeck(newDeck);
        setIsDeckFull(newDeck.length >= 20); // Update isDeckFull
      };

      const removeCardFromDeck = (cardToRemove) => {
        const newDeck = currentDeck.filter(card => card.id !== cardToRemove.id);
        setCurrentDeck(newDeck);
        setIsDeckFull(newDeck.length >= 20); // Update isDeckFull
      };

      const closeModal = () => {
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => setIsModalVisible(false));
      };

      const handleSaveDeck = async () => {
        if (!user) {
          console.error("User not authenticated.");
          return;
        }

        try {
          // Fetch existing decks to determine the next available deck number
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return;
          }

          let nextDeckNumber = 1;
          if (profileData) {
            // Determine the next available DECK_LIST_X column
            while (profileData[`DECK_LIST_${nextDeckNumber}`]) {
              nextDeckNumber++;
            }
          }

          // Convert the deck to JSON format
          const deckListJSON = JSON.stringify(currentDeck);

          // Update the profile with the new deck
          const updateObject = { [`DECK_LIST_${nextDeckNumber}`]: deckListJSON };
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateObject)
            .eq('id', user.id);

          if (updateError) {
            console.error("Error saving deck to Supabase:", updateError);
            return;
          }

          console.log(`Deck saved to DECK_LIST_${nextDeckNumber}`);
          alert(`Deck saved to DECK_LIST_${nextDeckNumber}`);
          navigation.navigate('Decklistscreen', { deckNumber: nextDeckNumber });

        } catch (error) {
          console.error("Error saving deck:", error);
        }
      };


      return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: currentPalette.inputBackground, borderColor: currentPalette.borderColor, color: currentPalette.text }]}
            placeholder="Search for cards..."
            placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
            value={searchText}
            onChangeText={setSearchText}
          />

          {loading ? (
            <Text style={[styles.text, { color: currentPalette.text }]}>Loading cards...</Text>
          ) : error ? (
            <Text style={[styles.errorText, { color: currentPalette.text }]}>Error: {error}</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              {setsData.map((set, index) => (
                <View key={index} style={[styles.setContainer, index > 0 ? styles.setSpacing : null]}>
                  <Text style={[styles.setLabel, { color: currentPalette.text }]}>{set.setName}</Text>
                  <View style={styles.cardListContainer}>
                    {set.cards.map((item) => {
                      const isInDeck = currentDeck.some(deckCard => deckCard.id === item.id);
                      return (
                        <View key={item.id} style={styles.cardItem}>
                          <View style={styles.cardImageContainer}>
                            <Image
                              style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
                              source={{ uri: item.cachedImage }}
                              resizeMode="contain"
                            />
                            <TouchableOpacity
                              style={[styles.addButton, { backgroundColor: currentPalette.addButton }]}
                              onPress={() => handleCardPress(item)}
                            >
                              <Text style={styles.buttonText}>+</Text>
                            </TouchableOpacity>
                            {isInDeck && (
                              <TouchableOpacity
                                style={[styles.removeButton, { backgroundColor: currentPalette.removeButton }]}
                                onPress={() => removeCardFromDeck(item)}
                              >
                                <Text style={styles.buttonText}>-</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={{ color: currentPalette.text, margin: 10 }}>
            Deck Count: {currentDeck.length} / 20
          </Text>
          {deckError && <Text style={{ color: 'red', margin: 10 }}>{deckError}</Text>}

          <ScrollView style={{ maxHeight: 200, margin: 10 }}>
            {
              Object.values(currentDeck.reduce((acc, card) => {
                if (!acc[card.id]) {
                  acc[card.id] = { ...card, count: 0 };
                }
                acc[card.id].count += 1;
                return acc;
              }, {})).map((card) => (
                <View key={card.id} style={styles.deckCardItem}>
                  <Text style={{ color: currentPalette.text }}>
                    {card.name} {card.count > 1 ? `X${card.count}` : ''}
                  </Text>
                  <TouchableOpacity onPress={() => removeCardFromDeck(card)}>
                    <Text style={{ color: 'red', marginLeft: 10, fontWeight: 'bold' }}>X</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
          </ScrollView>

          {isDeckFull && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: currentPalette.saveButton }]}
              onPress={handleSaveDeck}
            >
              <Text style={styles.saveButtonText}>Save Deck</Text>
            </TouchableOpacity>
          )}

          <Modal
            visible={isModalVisible}
            transparent={true}
            onRequestClose={closeModal}
          >
            <TouchableOpacity
              style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              activeOpacity={1}
              onPress={closeModal}
            >
              <Animated.View style={[
                styles.modalContent,
                {
                  backgroundColor: currentPalette.cardBackground,
                  transform: [{
                    scale: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  }],
                },
              ]}>
                {selectedCard && (
                  <Image
                    source={{ uri: selectedCard.image + "/low.webp" }}
                    style={styles.fullSizeCardImage}
                    resizeMode="contain"
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
      },
      searchInput: {
        padding: 10,
        margin: 10,
        borderRadius: 5,
        borderWidth: 1,
      },
      scrollViewContent: {
        flexDirection: 'column',
        paddingBottom: 20,
      },
      setContainer: {
        marginBottom: 0,
      },
      setSpacing: {
        marginTop: 20,
      },
      setLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        marginBottom: 10,
      },
      cardListContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
      },
      cardItem: {
        width: '33.33%',
        padding: 0,
      },
      cardImageContainer: {
        position: 'relative',
        margin: 2,
      },
      cardImage: {
        aspectRatio: 3 / 4,
        borderRadius: 5,
        borderWidth: 1,

      },
      addButton: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      },
      removeButton: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      },
      buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
      },
      noImageText: {
        fontSize: 14,
        textAlign: 'center',
      },
      text: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
      },
      errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
      },
      modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      modalContent: {
        padding: 0,
        borderRadius: 5,
        width: '90%',
        maxWidth: 400,
      },
      fullSizeCardImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 3 / 4,
      },
      typeFilterContainer: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        margin: 5,
      },
      typeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 6,
      },
      typeButtonSelected: {
        backgroundColor: 'blue', // Change to your selected color
      },
      typeButtonText: {
        fontSize: 14,
      },
      allButton: {
        backgroundColor: 'grey',
      },
      deckCardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#CCCCCC' // Use a specific color from theme if available
            },
      saveButton: {
        padding: 15,
        margin: 10,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
      },
      saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
      },
    });

    export default MyDecksScreen;
