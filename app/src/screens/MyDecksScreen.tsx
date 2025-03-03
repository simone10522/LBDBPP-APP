import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Modal, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import Accordion from '../components/Accordion'; // Import the Accordion component

const MyDecksScreen = () => {
  const [setsData, setSetsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [animatedValue] = useState(new Animated.Value(0));
  const [selectedTypes, setSelectedTypes] = useState([]);

  const { isDarkMode } = useAuth();
  const currentPalette = isDarkMode ? darkPalette : lightPalette;

  useEffect(() => {
    fetchCardSets();
  }, []);

  const fetchCardSets = async () => {
    setLoading(true);
    setError(null);
    try {
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

        console.log('searchText:', searchText, 'selectedTypes:', selectedTypes);

        if (searchText) {
          filteredCards = filteredCards.filter(card =>
            card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
          );
          console.log('filteredCards length after searchText:', filteredCards.length);
        }

        if (selectedTypes.length > 0) {
          filteredCards = filteredCards.filter(card => {
            if (!card.types || !Array.isArray(card.types)) {
              return false;
            }
            return selectedTypes.every(type => card.types.includes(type));
          });
          console.log('filteredCards length after selectedTypes:', filteredCards.length);
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
    } catch (err) {
      console.error("Error fetching cards:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardSets();
  }, [searchText, selectedTypes]);

  const handleCardPress = (card) => {
    setSelectedCard(card);
    setIsModalVisible(true);
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setIsModalVisible(false));
  };

  const handleTypeSelection = (type) => {
    setSelectedTypes((prevSelectedTypes) => {
      if (prevSelectedTypes.includes(type)) {
        return prevSelectedTypes.filter((t) => t !== type);
      } else {
        return [...prevSelectedTypes, type];
      }
    });
  };

  const handleAllSelection = () => {
    setSelectedTypes([]);
  };

  const cardTypes = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: currentPalette.inputBackground, borderColor: currentPalette.borderColor, color: currentPalette.text }]}
        placeholder="Search for cards..."
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* Accordion for Type Filters */}
      <Accordion title="Types">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.typeFilterContainer, { backgroundColor: currentPalette.cardBackground }]}
        >
          <TouchableOpacity
            key="all"
            style={[
              styles.typeButton,
              styles.allButton,
              selectedTypes.length === 0 && styles.typeButtonSelected,
              { backgroundColor: currentPalette.buttonBackground }
            ]}
            onPress={handleAllSelection}
          >
            <Text style={[styles.typeButtonText, { color: currentPalette.buttonText }]}>All</Text>
          </TouchableOpacity>
          {cardTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                selectedTypes.includes(type) && styles.typeButtonSelected,
                { backgroundColor: currentPalette.buttonBackground }
              ]}
              onPress={() => handleTypeSelection(type)}
            >
              <Text style={[styles.typeButtonText, { color: currentPalette.buttonText }]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Accordion>

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
                {set.cards.map((item) => (
                  <View key={item.id} style={styles.cardItem}>
                    <TouchableOpacity onPress={() => handleCardPress(item)} activeOpacity={0.7}>
                      {item.cachedImage ? (
                        <Image
                          style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
                          source={{ uri: item.cachedImage }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={[styles.noImageText, { color: currentPalette.text }]}>No Image</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
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
  cardImage: {
    aspectRatio: 3 / 4,
    borderRadius: 5,
    borderWidth: 1,
    margin: 2,
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
  }
});

export default MyDecksScreen;
