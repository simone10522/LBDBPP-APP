import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, Dimensions, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes'; // Importa palette colori (ma non ThemeContext)

const MyDecksScreen = () => {
  const [setsData, setSetsData] = useState([]); // Array to hold sets data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const theme = 'dark'; // Tema predefinito: dark
  const currentPalette = theme === 'dark' ? darkPalette : lightPalette; // Usa darkPalette
  const [imageCache, setImageCache] = useState({}); // In-memory cache for images
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    fetchCardSets(); // Fetch sets instead of combined cards
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

        const filteredCards = searchText
          ? cardsData.filter(card =>
              card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
            )
          : cardsData;

        if (filteredCards.length > 0) { // Only add set if it has cards after filtering
          const setWithCachedImages = {
            setName: setData.name, // Or setId if name is not needed
            cards: await Promise.all(filteredCards.map(async card => {
              const webpImage = `${card.image}/low.webp`;
              if (imageCache[webpImage]) {
                return { ...card, cachedImage: imageCache[webpImage] }; // Use cached image
              } else {
                // In a real app, you might want to actually check if the webp image exists
                // For simplicity, we'll assume webp exists and fallback to png if it fails.
                try {
                  const response = await fetch(webpImage);
                  if (response.ok) {
                    imageCache[webpImage] = webpImage; // Cache webp image url
                    return { ...card, cachedImage: webpImage };
                  } else {
                    const pngImage = `${card.image}/low.png`; // Fallback to png
                    imageCache[pngImage] = pngImage; // Cache png image url for fallback
                    return { ...card, cachedImage: pngImage };
                  }
                } catch (error) {
                  const pngImage = `${card.image}/low.png`; // Fallback to png on fetch error
                  imageCache[pngImage] = pngImage; // Cache png image url for fallback
                  return { ...card, cachedImage: pngImage };
                }
              }
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
    fetchCardSets(); // Refetch sets when searchText changes
  }, [searchText]);

  const handleCardPress = (card) => {
    setSelectedCard(card);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
      <TextInput
        style={[styles.searchInput, {
          backgroundColor: currentPalette.inputBackground,
          borderColor: currentPalette.borderColor,
          color: currentPalette.text
        }]}
        placeholder="Search for cards..."
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#888'}
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            {selectedCard && (
              <Image
                source={{ uri: selectedCard.image }} // Use high-resolution image here
                style={styles.fullSizeCardImage}
                resizeMode="contain"
              />
            )}
          </View>
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
    flexDirection: 'column', // Change to column to stack sets vertically
    paddingBottom: 20, // Add padding at the bottom for better scroll view aesthetics
  },
  setContainer: {
    marginBottom: 0, // Spacing will be handled by setSpacing style
  },
  setSpacing: {
    marginTop: 20, // Adds vertical space between sets
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 0,
    borderRadius: 5,
    width: '90%',
    maxWidth: 400, // Optional max width for larger screens
  },
  fullSizeCardImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 3 / 4, // Maintain card aspect ratio
  },
});

export default MyDecksScreen;
