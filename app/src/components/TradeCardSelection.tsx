import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, Modal, TouchableOpacity, Animated, PanResponder, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import cardDataSetsA1 from '../../assets/cards/A1.json';
import cardDataSetsA1a from '../../assets/cards/A1a.json';
import cardDataSetsA2a from '../../assets/cards/A2a.json';
import cardDataSetsA2 from '../../assets/cards/A2.json';
import cardDataSetsPA from '../../assets/cards/PA.json';
import Accordion from './Accordion';
import CountryFlag from "react-native-country-flag";
import InterstitialAdComponent from './InterstitialAd';
import { Undo2 } from 'lucide-react-native'; // Import the specific Undo2 icon

const sets = [
  { setName: "Genetic Apex", cards: cardDataSetsA1.cards.map(card => ({ id: card.id, name: card.name })) },
  { setName: "Mythical Island", cards: cardDataSetsA1a.cards.map(card => ({ id: card.id, name: card.name })) },
  { setName: "Triumphant Light", cards: cardDataSetsA2a.cards.map(card => ({ id: card.id, name: card.name })) },
  { setName: "Space-Time Smackdown", cards: cardDataSetsA2.cards.map(card => ({ id: card.id, name: card.name })) },
  { setName: "Promos-A Old", cards: cardDataSetsPA.cards.map(card => ({ id: card.id, name: card.name })) }
];

const TradeCardSelection = ({ onCardsSelected, isDarkMode, loadExistingCards: shouldLoadExistingCards, onBack, selectionType }) => {
  const [setsData, setSetsData] = useState([]);
  const [loading, setLoading] = useState(false); // Loading for initial data and loading more sets
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [animatedValue] = useState(new Animated.Value(0));
  const [selectedTradeCards, setSelectedTradeCards] = useState([]);
  const [cardError, setCardError] = useState(null);
  const [visibleSetsCount, setVisibleSetsCount] = useState(1); // Control number of visible sets
  const [currentSelection, setCurrentSelection] = useState(selectionType);
  const [selectedLanguage, setSelectedLanguage] = useState('it');
  const [flags, setFlags] = useState([
    { code: 'IT', isoCode: 'it' },
    { code: 'GB', isoCode: 'gb' },
    { code: 'FR', isoCode: 'fr' },
    { code: 'ES', isoCode: 'es' },
    { code: 'DE', isoCode: 'de' },
    { code: 'JP', isoCode: 'jp' },
    { code: 'CN', isoCode: 'cn' },
  ]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [showAd, setShowAd] = useState(false);


  const currentPalette = isDarkMode ? darkPalette : lightPalette;
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  // In-memory cache for card details
  const cardCache = useRef({});

  useEffect(() => {
    loadInitialSets();
  }, [searchText]);

  const loadInitialSets = async () => {
    setLoading(true);
    setError(null);
    try {
      let filteredSets = sets;
      if (searchText) {
        filteredSets = sets.map(set => ({
          ...set,
          cards: set.cards.filter(card =>
            card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
          )
        })).filter(set => set.cards.length > 0);
      }
      setSetsData(filteredSets.slice(0, visibleSetsCount)); // Load initial sets
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const loadMoreSets = useCallback(async () => {
    if (isFetchingMore || loading || setsData.length >= sets.length) {
      return; // Prevent loading more if already loading, initial loading, or all sets loaded
    }
    setIsFetchingMore(true);
    try {
      let nextVisibleSetsCount = visibleSetsCount + 1;
      let filteredSets = sets;
      if (searchText) {
        filteredSets = sets.map(set => ({
          ...set,
          cards: set.cards.filter(card =>
            card.name && card.name.toLowerCase().includes(searchText.toLowerCase())
          )
        })).filter(set => set.cards.length > 0);
      }
      const nextSets = filteredSets.slice(visibleSetsCount, nextVisibleSetsCount);
      if (nextSets.length > 0) {
        setSetsData(prevSetsData => [...prevSetsData, ...nextSets]);
        setVisibleSetsCount(nextVisibleSetsCount);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetchingMore(false);
    }
  }, [visibleSetsCount, isFetchingMore, searchText, loading]);


  useEffect(() => {
    if (shouldLoadExistingCards && selectionType === 'have') {
      loadCardsFromSupabase('what_i_have');
    }
    if (shouldLoadExistingCards && selectionType === 'want') {
      loadCardsFromSupabase('what_i_want');
    }
  }, [shouldLoadExistingCards, selectionType]);

  const loadCardsFromSupabase = async (columnName) => {
    if (!user) {
      console.error("User not authenticated.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_cards')
        .select(columnName)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        setError(error.message);
        return;
      }

      if (data && data[columnName]) {
        // Ensure count is initialized
        setSelectedTradeCards(data[columnName].map(card => ({ ...card, count: card.count || 1 })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = async (card) => {
    setCardError(null);

    const existingCardIndex = selectedTradeCards.findIndex(selectedCard => selectedCard.id === card.id);

    if (existingCardIndex > -1) {
      const updatedSelectedCards = [...selectedTradeCards];
      updatedSelectedCards[existingCardIndex].count = (updatedSelectedCards[existingCardIndex].count || 1) + 1;
      setSelectedTradeCards(updatedSelectedCards);
    } else {
      // Use cached data if available
      const cachedCard = cardCache.current[card.id];
      if (cachedCard) {
        setSelectedTradeCards([...selectedTradeCards, { ...cachedCard, count: 1 }]);
      } else {
        // This should rarely happen now, as renderCardItem fetches details
        try {
          const cardDetailsUrl = `https://api.tcgdex.net/v2/en/cards/${card.id}`;
          const cardDetailsResponse = await fetch(cardDetailsUrl);

          if (!cardDetailsResponse.ok) {
            setCardError(`Failed to fetch card details for ${card.name}`);
            return;
          }

          const cardDetails = await cardDetailsResponse.json();
          // *** KEY CHANGE: Modify rarity format here ***
          const formattedRarity = cardDetails.rarity.toLowerCase().replace(/ /g, '_');
          const updatedCard = {
            ...card,
            image: cardDetails.image + "/low.webp",
            rarity: formattedRarity, // Use the formatted rarity
            count: 1
          };

          // Update cache
          cardCache.current[card.id] = updatedCard;
          setSelectedTradeCards([...selectedTradeCards, updatedCard]);

        } catch (err) {
          console.error("Error fetching card details:", err);
          setCardError(`Error fetching card details for ${card.name}`);
        }
      }
    }
  };

  const handleRemoveCard = (card) => {
    const existingCardIndex = selectedTradeCards.findIndex(selectedCard => selectedCard.id === card.id);
    if (existingCardIndex > -1) {
      const updatedSelectedCards = [...selectedTradeCards];
      if (updatedSelectedCards[existingCardIndex].count > 1) {
        updatedSelectedCards[existingCardIndex].count -= 1;
        setSelectedTradeCards(updatedSelectedCards);
      } else {
        setSelectedTradeCards(selectedTradeCards.filter(selectedCard => selectedCard.id !== card.id));
      }
    }
  };

  const handleDoneSelecting = async () => {
    if (!user) {
      console.error("User not authenticated.");
      return;
    }

    const supabaseColumnName = selectionType === 'have' ? 'what_i_have' : 'what_i_want';

    try {
      const { data: existingTradeCard, error: selectError } = await supabase
        .from('trade_cards')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error("Error checking existing trade card:", selectError);
        return;
      }

      const cardData = selectedTradeCards.map(card => ({
        id: card.id,
        name: card.name,
        image: card.image,
        rarity: card.rarity,
        count: card.count,
        language: selectedLanguage,
      }));

      if (existingTradeCard) {
        const { error: updateError } = await supabase
          .from('trade_cards')
          .update({ [supabaseColumnName]: cardData })
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`Error updating trade card for ${supabaseColumnName}:`, updateError);
          return;
        }
        console.log(`Trade card updated successfully for ${supabaseColumnName}.`);
      } else {
        const { error: insertError } = await supabase
          .from('trade_cards')
          .insert([{ user_id: user.id, [supabaseColumnName]: cardData }]);

        if (insertError) {
          console.error(`Error inserting trade card for ${supabaseColumnName}:`, insertError);
          return;
        }
        console.log(`Trade card inserted successfully for ${supabaseColumnName}.`);
      }

      // Mostriamo l'ad e attendiamo che venga chiuso
      setShowAd(true);

      // Attendiamo un breve timeout per assicurarci che l'ad abbia il tempo di caricarsi
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error("Error in handleDoneSelecting:", err);
    }
  };

  const handleAdClosed = () => {
    setShowAd(false);
    // Aggiorniamo l'UI e completiamo il processo solo dopo che l'ad è stato chiuso
    onCardsSelected(selectedTradeCards);
  };

  const handleAdError = (error: any) => {
    console.error('Ad failed to load:', error);
    setShowAd(false);
    // In caso di errore dell'ad, procediamo comunque con l'aggiornamento dell'UI
    onCardsSelected(selectedTradeCards);
  };

  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
    }).start(() => setIsModalVisible(false));
  };

  const renderCardItem = ({ item }) => {
    const isSelected = selectedTradeCards.some(selectedCard => selectedCard.id === item.id);
    const selectedItem = selectedTradeCards.find(selectedCard => selectedCard.id === item.id);
    const cardCount = selectedItem ? selectedItem.count : 0;

    // Use cached data if available
    const cachedCard = cardCache.current[item.id];

    if (cachedCard) {
      // Render from cache
      return (
        <View key={item.id} style={styles.cardItem}>
          <View style={styles.cardImageContainer}>
            <Image
              style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
              source={{ uri: cachedCard.image }}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: 'green' }]}
              onPress={() => handleCardPress(item)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
            {isSelected && (
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: 'red' }]}
                onPress={() => handleRemoveCard(cachedCard)}
              >
                <Text style={styles.buttonText}>-</Text>
              </TouchableOpacity>
            )}
            {cardCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{cardCount}</Text>
              </View>
            )}
          </View>
        </View>
      );
    } else {
      // Fetch and render
      return (
        <View key={item.id} style={styles.cardItem}>
          <View style={styles.cardImageContainer}>
            <Text style={[styles.rarityText, { color: currentPalette.text }]}>Loading...</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: 'green' }]}
              onPress={() => handleCardPress(item)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
            {isSelected && (
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: 'red' }]}
                  onPress={() => handleRemoveCard(item)}
                >
                  <Text style={styles.buttonText}>-</Text>
                </TouchableOpacity>
              )}
            {cardCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{cardCount}</Text>
              </View>
            )}
            {/* Fetch card details on mount */}
            <FetchCardDetails cardId={item.id} cache={cardCache} currentPalette={currentPalette} />
          </View>
        </View>
      );
    }
  };

  const renderSelectedItem = ({ item }) => {

    return (
      <View key={item.id} style={styles.cardItem}>
        <View style={styles.cardImageContainer}>
          <Image
            style={[styles.cardImage, { borderColor: currentPalette.borderColor, width: '100%', height: undefined }]}
            source={{ uri: item.image }}
            resizeMode="contain"
          />
          <Text style={[styles.rarityText, { color: currentPalette.text }]}>
            Rarity: {item.rarity}
          </Text>
          <TouchableOpacity
            style={[
              styles.removeButton,
              { backgroundColor: 'red' },
            ]}
            onPress={() => handleRemoveCard(item)}
          >
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
          {item.count > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{item.count}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSetItem = ({ item }) => {
    return (
      <View style={[styles.setContainer]}>
        <Text style={[styles.setLabel, { color: currentPalette.text }]}>{item.setName}</Text>
        <FlatList
          data={item.cards}
          renderItem={renderCardItem}
          keyExtractor={(card) => card.id}
          numColumns={3}
          contentContainerStyle={styles.cardListContainer}
          initialNumToRender={9} // Render 9 cards initially (3 rows)
          maxToRenderPerBatch={9}   // Render in batches of 9 as user scrolls
          windowSize={5}          // Render cards within 5x viewport height
          removeClippedSubviews={true} // Enable aggressive view clipping
          getItemLayout={(data, index) => ({length: 120, offset: 120 * index, index})} // Assuming cardItem height is around 120
        />
      </View>
    )
  };


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.dx > 30 && gestureState.dy < 30 && gestureState.dy > -30;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          onBack();
        }
      },
    })
  ).current;

  const ListFooterComponent = () => {
    if (!isFetchingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentPalette.text} />
      </View>
    );
  };


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentPalette.background, width: '100%' }]}
      {...panResponder.panHandlers}
    >
      <Text style={[styles.selectionText, { color: currentPalette.text }]}>
        {currentSelection === 'have' ? 'My Cards' : 'I Want'}
      </Text>

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
        <>
          <Accordion title="All Cards" >
            <View style={styles.flagsContainer}>
              {flags.map((flag) => (
                <TouchableOpacity
                  key={flag.isoCode}
                  style={[
                    styles.flagButton,
                    selectedLanguage === flag.isoCode && styles.selectedFlag,
                  ]}
                  onPress={() => setSelectedLanguage(flag.isoCode)}
                >
                  <CountryFlag isoCode={flag.isoCode} size={25} />
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              ref={flatListRef}
              data={setsData}
              renderItem={renderSetItem}
              keyExtractor={(item, index) => index.toString()}
              onEndReached={loadMoreSets}
              onEndReachedThreshold={0.5}
              ListFooterComponent={ListFooterComponent}
              contentContainerStyle={styles.scrollViewContent}
            />
          </Accordion>

          <Accordion title="Selected Cards">
            <FlatList
              data={selectedTradeCards}
              renderItem={renderSelectedItem}
              keyExtractor={(card) => card.id}
              numColumns={3}
              contentContainerStyle={styles.cardListContainer}
            />
            <Text style={{ color: currentPalette.text, margin: 10, textAlign: 'center' }}>
              Total Selected Cards: {selectedTradeCards.reduce((sum, card) => sum + (card.count || 0), 0)}
            </Text>
            {cardError && <Text style={{ color: 'red', margin: 10, textAlign: 'center' }}>{cardError}</Text>}
          </Accordion>
        </>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.doneButtonOverlay, { backgroundColor: currentPalette.buttonBackground }]}
          onPress={handleDoneSelecting}
        >
          <Text style={[styles.doneButtonText, { color: currentPalette.buttonText }]}>Save List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.undoButton, { backgroundColor: currentPalette.buttonBackground }]}
          onPress={onBack} // Navigate back to TradeScreen
        >
          <View style={{ width: 24, height: 24 }}>
            <Undo2 color={currentPalette.buttonText} size={24} />
          </View>
        </TouchableOpacity>
      </View>

      {showAd && (
        <InterstitialAdComponent
          onAdClosed={handleAdClosed}
          onAdFailedToLoad={handleAdError}
        />
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

const FetchCardDetails = React.memo(({ cardId, cache, currentPalette }) => {
  const [cardDetails, setCardDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const cardDetailsUrl = `https://api.tcgdex.net/v2/en/cards/${cardId}`;
        const cardDetailsResponse = await fetch(cardDetailsUrl);

        if (!cardDetailsResponse.ok) {
          setError(`Failed to fetch card details for ${cardId}`);
          return;
        }

        const details = await cardDetailsResponse.json();
         // *** KEY CHANGE: Modify rarity format here ***
        const formattedRarity = details.rarity.toLowerCase().replace(/ /g, '_');
        const updatedCard = {
          id: details.id,
          name: details.name,
          image: details.image + "/low.webp",
          rarity: formattedRarity, // Use formatted rarity
        };


        // Update the cache
        cache.current[cardId] = updatedCard;
        setCardDetails(updatedCard);

      } catch (err) {
        setError("Error fetching card details: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [cardId]);

  if (loading) {
    return <Text style={{ color: currentPalette.text }}>Loading details...</Text>;
  }

  if (error) {
    return <Text style={{ color: 'red' }}>{error}</Text>;
  }

  if (!cardDetails) {
    return null; // Should not happen, but good for type safety
  }

  return (
    <Image
      style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
      source={{ uri: cardDetails.image }}
      resizeMode="contain"
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
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
    marginBottom: 20,
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
    height: 170, // Approximate height for getItemLayout
  },
  cardImageContainer: {
    position: 'relative',
    margin: 0,
  },
  cardImage: {
    aspectRatio: 3 / 4,
    borderRadius: 5,
    borderWidth: 1,

  },
  selectButton: {
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
    aspectRatio: 4 / 4,
  },
  doneButton: {
    padding: 15,
    margin: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    fontWeight: 'bold',
  },
  selectedButton: {
    backgroundColor: 'red',
  },
  rarityText: {
    fontSize: 12,
    position: 'absolute',
    top: 5,
    left: 5,
  },
  countBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'blue',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  doneButtonOverlay: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  undoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  flagsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  flagButton: {
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 0,
  },
  selectedFlag: {
    borderColor: 'green',
  },
});

export default TradeCardSelection;
