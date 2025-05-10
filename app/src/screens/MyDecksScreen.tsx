import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import cardDataSetsA1 from '../../assets/cards/modified/A1.json';
import cardDataSetsA1a from '../../assets/cards/modified/A1a.json';
import cardDataSetsA2a from '../../assets/cards/modified/A2a.json';
import cardDataSetsA2 from '../../assets/cards/modified/A2.json';
import cardDataSetsA2b from '../../assets/cards/modified/A2b.json';
import cardDataSetsA3 from '../../assets/cards/modified/A3.json';
import cardDataSetsPA from '../../assets/cards/modified/PA.json';
import BannerAdComponent from '../components/BannerAd';
import Accordion from '../components/Accordion';
import cardImagesA1 from '../components/cardImages/A1';
import cardImagesA1a from '../components/cardImages/A1a';
import cardImagesA2a from '../components/cardImages/A2a';
import cardImagesA2 from '../components/cardImages/A2';
import cardImagesA2b from '../components/cardImages/A2b';
import cardImagesA3 from '../components/cardImages/A3';

const sets = [
  { setName: "Genetic Apex", cards: cardDataSetsA1.cards || cardDataSetsA1 },
  { setName: "Mythical Island", cards: cardDataSetsA1a.cards || cardDataSetsA1a },
  { setName: "Triumphant Light", cards: cardDataSetsA2a.cards || cardDataSetsA2a },
  { setName: "Space-Time Smackdown", cards: cardDataSetsA2.cards || cardDataSetsA2 },
  { setName: "Shining Revelry", cards: cardDataSetsA2b.cards || cardDataSetsA2b }
];

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
  const [isDeckFull, setIsDeckFull] = useState(false);
  const [visibleSets, setVisibleSets] = useState(1);
  const [deckName, setDeckName] = useState('');
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);

  const { isDarkMode, user } = useAuth();
  const currentPalette = isDarkMode ? darkPalette : lightPalette;
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef<FlatList>(null);

  const { deckNumber } = route.params || {};

  useEffect(() => {
    fetchCardSets();
  }, []);

  useEffect(() => {
    if (deckNumber && user) {
      fetchDeckData(deckNumber);
    }
  }, [deckNumber, user]);

  const fetchDeckData = async (deckNumber) => {
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
        setCurrentDeck(deck.cards);
        setDeckName(deck.name);
        setIsDeckFull(deck.cards.length >= 20);
      }
    } catch (error) {
      console.error("Error parsing deck list:", error);
    }
  };

  const fetchCardSets = async () => {
    setLoading(true);
    setError(null);
    try {
      const sets = [
        {
          setName: "Genetic Apex",
          cards: cardDataSetsA1.cards
            ? cardDataSetsA1.cards.map(card => ({
                ...card,
                setName: "Genetic Apex",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA1.map(card => ({
                ...card,
                setName: "Genetic Apex",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Mythical Island",
          cards: cardDataSetsA1a.cards
            ? cardDataSetsA1a.cards.map(card => ({
                ...card,
                setName: "Mythical Island",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA1a.map(card => ({
                ...card,
                setName: "Mythical Island",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Triumphant Light",
          cards: cardDataSetsA2a.cards
            ? cardDataSetsA2a.cards.map(card => ({
                ...card,
                setName: "Triumphant Light",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA2a.map(card => ({
                ...card,
                setName: "Triumphant Light",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Space-Time Smackdown",
          cards: cardDataSetsA2.cards
            ? cardDataSetsA2.cards.map(card => ({
                ...card,
                setName: "Space-Time Smackdown",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA2.map(card => ({
                ...card,
                setName: "Space-Time Smackdown",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Shining Revelry",
          cards: cardDataSetsA2b.cards
            ? cardDataSetsA2b.cards.map(card => ({
                ...card,
                setName: "Shining Revelry",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA2b.map(card => ({
                ...card,
                setName: "Shining Revelry",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Celestial Guardians",
          cards: cardDataSetsA3.cards
            ? cardDataSetsA3.cards.map(card => ({
                ...card,
                setName: "Celestial Guardians",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsA3.map(card => ({
                ...card,
                setName: "Celestial Guardians",
                cachedImage: card.image + "/low.webp",
              }))
        },
        {
          setName: "Promos-A Old",
          cards: cardDataSetsPA.cards
            ? cardDataSetsPA.cards.map(card => ({
                ...card,
                setName: "Promos-A Old",
                cachedImage: card.image + "/low.webp",
              }))
            : cardDataSetsPA.map(card => ({
                ...card,
                setName: "Promos-A Old",
                cachedImage: card.image + "/low.webp",
              }))
        }
      ];
  
      let filteredSets = sets;
  
      if (searchText) {
        filteredSets = sets.map(set => ({
          ...set,
          cards: set.cards.filter(card =>
            card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
          )
        })).filter(set => set.cards.length > 0);
      }
      setSetsData(filteredSets);
  
    } catch (err) {
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
      setDeckError();
      return;
    }

    const cardCount = currentDeck.filter((c) => c.name === card.name).length;
    if (cardCount >= 2) {
      setDeckError();
      return;
    }

    const newDeck = [...currentDeck, card];
    setCurrentDeck(newDeck);
    setIsDeckFull(newDeck.length >= 20);
  };

  const removeCardFromDeck = (cardToRemove) => {
    const index = currentDeck.findIndex(card => card.id === cardToRemove.id);
    if (index !== -1) {
      const newDeck = [...currentDeck];
      newDeck.splice(index, 1);
      setCurrentDeck(newDeck);
      setIsDeckFull(newDeck.length >= 20);
    }
  };

  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => setIsModalVisible(false));
  };

  const openSaveModal = () => {
    if (currentDeck.length < 20) {
      Alert.alert("Attenzione", "Non puoi salvare un mazzo con meno di 20 carte.");
      return;
    }
    setIsSaveModalVisible(true);
  };

  const closeSaveModal = () => {
    setIsSaveModalVisible(false);
  };

  const handleSaveDeck = async () => {
    console.log("handleSaveDeck: deckNumber =", deckNumber);
    console.log("handleSaveDeck: route.params =", route.params);
    if (!user) {
      console.error("User not authenticated.");
      return;
    }

    if (!deckName.trim()) {
      alert("Please enter a deck name.");
      return;
    }

    try {
      const deckData = {
        name: deckName,
        cards: currentDeck,
      };

      if (deckNumber) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ [`DECK_LIST_${deckNumber}`]: deckData })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error saving deck to Supabase (edit):", updateError);
          return;
        }

        console.log(`Deck "${deckName}" updated to DECK_LIST_${deckNumber}`);
        Alert.alert("Success", `Deck "${deckName}" updated!`);

      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for new deck:", profileError);
          return;
        }

        let availableDeckSlot = null;
        for (let i = 1; i <= 10; i++) {
          if (!profile[`DECK_LIST_${i}`]) {
            availableDeckSlot = i;
            break;
          }
        }

        if (availableDeckSlot) {
          const { error: insertError } = await supabase
            .from('profiles')
            .update({ [`DECK_LIST_${availableDeckSlot}`]: deckData })
            .eq('id', user.id);

          if (insertError) {
            console.error("Error saving new deck to Supabase:", insertError);
            return;
          }

          console.log(`New deck "${deckName}" saved to DECK_LIST_${availableDeckSlot}`);
          Alert.alert("Success", `New deck "${deckName}" created!`);
        } else {
          Alert.alert("Deck List Full", "You have reached the maximum number of decks (10). Please delete an existing deck to create a new one.");
          return;
        }
      }

      closeSaveModal();
      navigation.navigate('Decklistscreen', { refresh: true });

    } catch (error) {
      console.error("Error saving deck:", error);
      Alert.alert("Error", "Failed to save deck. Please try again.");
    }
  };

  const getCardImage = (card) => {
    if (!card || !card.id) return null;
    if (card.id.startsWith('A1-')) return cardImagesA1[card.id];
    if (card.id.startsWith('A1a-')) return cardImagesA1a[card.id];
    if (card.id.startsWith('A2a-')) return cardImagesA2a[card.id];
    if (card.id.startsWith('A2-')) return cardImagesA2[card.id];
    if (card.id.startsWith('A2b-')) return cardImagesA2b[card.id];
    if (card.id.startsWith('A3-')) return cardImagesA3[card.id];
    return null;
  };

  const renderCardItem = ({ item }) => {
    const count = currentDeck.filter(deckCard => deckCard.id === item.id).length;
    const isInDeck = count > 0;
    // Disabilita solo il tasto + della carta che ha già 2 copie
    const plusDisabled = count >= 2;
    return (
      <View key={item.id} style={styles.cardItem}>
        <View style={styles.cardImageContainer}>
          <Image
            style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
            source={
              getCardImage(item)
                ? getCardImage(item)
                : { uri: item.cachedImage }
            }
            resizeMode="contain"
          />
          {/* Badge count centrato sull'immagine */}
          {isInDeck && (
            <View style={styles.centerCountBadge}>
              <Text style={styles.centerCountText}>×{count}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: plusDisabled ? '#888' : 'green', opacity: plusDisabled ? 0.6 : 1 }
            ]}
            onPress={() => !plusDisabled && handleCardPress(item)}
            disabled={plusDisabled}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          {isInDeck && (
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: 'red' }]}
              onPress={() => removeCardFromDeck(item)}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCardGridItem = ({ item }) => {
    const count = currentDeck.filter(deckCard => deckCard.id === item.id).length;
    const isInDeck = count > 0;
    const plusDisabled = count >= 2 || currentDeck.length >= 20;
    return (
      <View style={{
        flexBasis: '35%',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 2,
        padding: 2,
        margin: 1,
        minWidth: 0,
        maxWidth: '33%',
        position: 'relative',
      }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Image
            style={{ width: 120, height: 168, borderRadius: 8, borderWidth: 1, borderColor: currentPalette.borderColor }}
            source={
              getCardImage(item)
                ? getCardImage(item)
                : { uri: item.cachedImage }
            }
            resizeMode="contain"
          />
          {count > 0 && (
            <View style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
              zIndex: 2,
              minWidth: 32,
              alignItems: 'center',
            }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>×{count}</Text>
            </View>
          )}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: plusDisabled ? '#888' : 'green',
              opacity: plusDisabled ? 0.6 : 1,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 3,
            }}
            onPress={() => !plusDisabled && handleCardPress(item)}
            disabled={plusDisabled}
          >
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>+</Text>
          </TouchableOpacity>
          {isInDeck && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'red',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 3,
              }}
              onPress={() => removeCardFromDeck(item)}
            >
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>-</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSetItem = ({ item }) => (
    <View style={styles.setContainer}>
      <Accordion 
        title={item.setName}
        titleStyle={styles.setLabel}
      >
        <FlatList
          data={item.cards}
          renderItem={renderCardGridItem}
          keyExtractor={(card) => card.id}
          numColumns={3}
          contentContainerStyle={styles.cardListContainer}
        />
      </Accordion>
    </View>
  );

  const handleLoadMoreSets = () => {
    setVisibleSets(prevVisibleSets => prevVisibleSets + 1);
  };

  const renderSelectedCardThumbnail = ({ item }) => {
    const count = currentDeck.filter(card => card.id === item.id).length;
    return (
      <View style={styles.thumbnailContainer}>
        <TouchableOpacity onPress={() => removeCardFromDeck(item)}>
          <Image
            source={
              getCardImage(item)
                ? getCardImage(item)
                : { uri: item.cachedImage }
            }
            style={styles.thumbnailImage}
            resizeMode="contain"
          />
          {count > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>×{count}</Text>
            </View>
          )}
          <View style={styles.removeIconContainer}>
            <Text style={styles.removeIcon}>×</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Filtra carte per ricerca e set selezionato
  const filteredCards = sets[selectedSetIndex].cards.filter(card =>
    !searchText || (card.name && card.name.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
    <View style={{ height: 16 }} />
      {/* Tabs delle espansioni */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 5 }}>
        <FlatList
          horizontal
          data={sets}
          keyExtractor={set => set.setName}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.setPickerButton,
                selectedSetIndex === index
                  ? { backgroundColor: currentPalette.buttonBackground }
                  : { backgroundColor: isDarkMode ? '#222' : '#eee' }
              ]}
              onPress={() => setSelectedSetIndex(index)}
            >
              <Text style={{
                color: selectedSetIndex === index
                  ? currentPalette.buttonText
                  : (isDarkMode ? '#ccc' : '#222'),
                fontWeight: selectedSetIndex === index ? 'bold' : 'normal'
              }}>
                {item.setName}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
        
      </View>

      <TextInput
        style={[styles.searchInput, { backgroundColor: currentPalette.inputBackground, borderColor: currentPalette.borderColor, color: currentPalette.text }]}
        placeholder="Search for cards..."
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.selectedCardsContainer}>
        <View style={styles.selectedCardsHeader}>
          <Text style={[styles.selectedCardsTitle, { color: currentPalette.text }]}>
            Selected Cards ({currentDeck.length}/20)
          </Text>
          {deckError && <Text style={styles.deckError}>{deckError}</Text>}
        </View>
      </View>
      {/* Griglia vuota per le carte selezionate */}
      <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
        <FlatList
          horizontal
          data={[...Array(20)].map((_, idx) => currentDeck[idx] || null)}
          keyExtractor={(_, idx) => idx.toString()}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: 60,
                height: 84,
                marginRight: 8,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#ccc',
                backgroundColor: item ? 'white' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {item ? (
                <Image
                  source={
                    getCardImage(item)
                      ? getCardImage(item)
                      : { uri: item.cachedImage }
                  }
                  style={{ width: 58, height: 82, borderRadius: 4 }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          )}
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingVertical: 4 }}
        />
      </View>

      {/* Griglia carte del set selezionato */}
      <FlatList
        data={filteredCards}
        renderItem={renderCardGridItem}
        keyExtractor={(card) => card.id}
        numColumns={3}
        contentContainerStyle={styles.cardListContainer}
      />

      <TouchableOpacity
        style={[
          styles.saveButton, 
          { 
            backgroundColor: currentDeck.length >= 20 
              ? currentPalette.primary 
              : '#888888'
          }
        ]}
        onPress={openSaveModal}
        disabled={currentDeck.length < 20}
      >
        <Text style={styles.saveButtonText}>
          Save Deck
        </Text>
      </TouchableOpacity>

      {/* Save Deck Modal */}
      <Modal
        visible={isSaveModalVisible}
        transparent={true}
        onRequestClose={closeSaveModal}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentPalette.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: currentPalette.text }]}>Enter Deck Name</Text>
            <TextInput
              style={[styles.deckNameInput, { backgroundColor: currentPalette.inputBackground, borderColor: currentPalette.borderColor, color: currentPalette.text }]}
              placeholder="Deck Name"
              placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
              value={deckName}
              onChangeText={setDeckName}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'red' }]}
                onPress={closeSaveModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'green' }]}
                onPress={handleSaveDeck}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card Details Modal */}
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
                source={
                  getCardImage(selectedCard)
                    ? getCardImage(selectedCard)
                    : { uri: selectedCard.image + "/low.webp" }
                }
                style={styles.fullSizeCardImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bannerAdContainer}>
        <BannerAdComponent />
      </View>
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
    bottom: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
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
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
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
    backgroundColor: 'blue',
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
    borderBottomColor: '#CCCCCC'
  },
  saveButton: {
    padding: 5,
    margin: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deckNameInput: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    width: '100%',
    marginBottom: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
  thumbnailList: {
    padding: 8,
  },
  thumbnailContainer: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnailImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  countBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeIconContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deckError: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 8,
  },
  // Badge count centrato per la griglia principale e thumbnails
  centerCountBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -18 }, { translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  centerCountText: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  setPickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
  },
  selectedCardsContainer: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  selectedCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyDecksScreen;
