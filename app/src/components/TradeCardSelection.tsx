import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Modal, TouchableOpacity, Animated, PanResponder, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import cardDataSetsA2a from '../../assets/cards/modified/A2a.json';
import cardDataSetsA1 from '../../assets/cards/modified/A1.json';
import cardDataSetsA1a from '../../assets/cards/modified/A1a.json';
import cardDataSetsA2 from '../../assets/cards/modified/A2.json';
import Accordion from './Accordion';
import { Undo2 } from 'lucide-react-native'; // Import the specific Undo2 icon

const sets = [
  { setName: "Genetic Apex", cards: cardDataSetsA1.map(card => ({ 
      id: card.id, 
      name: card.name,
      rarity: card.rarity,
      image: card.image ? `${card.image}/low.webp` : undefined
    })) 
  },
  { setName: "Mythical Island", cards: cardDataSetsA1a.map(card => ({ 
      id: card.id, 
      name: card.name,
      rarity: card.rarity,
      image: card.image ? `${card.image}/low.webp` : undefined
    }))
  },
  { 
    setName: "Triumphant Light", 
    cards: cardDataSetsA2a.map(card => ({ 
      id: card.id, 
      name: card.name, 
      rarity: card.rarity,
      image: card.image ? `${card.image}/low.webp` : undefined
    })) 
  },
  { setName: "Space-Time Smackdown", cards: cardDataSetsA2.map(card => ({ 
      id: card.id, 
      name: card.name,
      rarity: card.rarity,
      image: card.image ? `${card.image}/low.webp` : undefined
    }))
  }
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
  const [isFetchingMore, setIsFetchingMore] = useState(false);

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
      
      // Filtro per escludere "two star", "three star" e "crown"
      filteredSets = filteredSets.map(set => ({
        ...set,
        cards: set.cards.filter(card => {
          if (!card.rarity) return true;
          const rarityLower = card.rarity.toLowerCase();
          return !["two star", "three star", "crown"].includes(rarityLower);
        })
      })).filter(set => set.cards.length > 0);
      
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
      
      // Filtro per escludere "two star", "three star" e "crown"
      filteredSets = filteredSets.map(set => ({
        ...set,
        cards: set.cards.filter(card => {
          if (!card.rarity) return true;
          const rarityLower = card.rarity.toLowerCase();
          return !["two star", "three star", "crown"].includes(rarityLower);
        })
      })).filter(set => set.cards.length > 0);
      
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
        // Verifica se la carta ha già dati completi
        if (card.image && card.rarity) {
          // Se i dati sono già presenti nella carta, usali direttamente
          const updatedCard = {
            ...card,
            count: 1
          };
          
          // Aggiorna la cache
          cardCache.current[card.id] = updatedCard;
          setSelectedTradeCards([...selectedTradeCards, updatedCard]);
        } else {
          // Altrimenti ottieni i dati dall'API come prima
          try {
            const cardDetailsUrl = `https://api.tcgdex.net/v2/en/cards/${card.id}`;
            const cardDetailsResponse = await fetch(cardDetailsUrl);

            if (!cardDetailsResponse.ok) {
              setCardError(`Failed to fetch card details for ${card.name}`);
              return;
            }

            const cardDetails = await cardDetailsResponse.json();
            
            // Verifica se la carta appartiene a uno dei nostri set con rarità già definita
            let cardRarity = "diamond"; // Default rarità
            // Estrai il codice del set dalla card.id (ad esempio 'A2a' da 'A2a-001')
            const setCode = card.id.split('-')[0];
            // Cerca il set corrispondente
            const cardSet = sets.find(set => {
              // Ottieni il nome del set dal codice
              if (setCode === 'A1') return set.setName === "Genetic Apex";
              if (setCode === 'A1a') return set.setName === "Mythical Island";
              if (setCode === 'A2a') return set.setName === "Triumphant Light";
              if (setCode === 'A2') return set.setName === "Space-Time Smackdown";
              return false;
            });
            
            if (cardSet) {
              const cardInSet = cardSet.cards.find(c => c.id === card.id);
              if (cardInSet && cardInSet.rarity) {
                cardRarity = cardInSet.rarity;
              }
            }
            
            const updatedCard = {
              ...card,
              image: cardDetails.image + "/low.webp",
              rarity: cardRarity,
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

      // Assicurati che cardData sia sempre un array, anche se vuoto
      const cardData = selectedTradeCards.map(card => ({
        id: card.id,
        name: card.name,
        image: card.image,
        rarity: card.rarity?.toLowerCase().replace(/ /g, '_'),
        count: card.count,
      })) || [];  // Se selectedTradeCards è vuoto, usa array vuoto

      if (existingTradeCard) {
        const { error: updateError } = await supabase
          .from('trade_cards')
          .update({ [supabaseColumnName]: cardData })
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`Error updating trade card for ${supabaseColumnName}:`, updateError);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('trade_cards')
          .insert([{ 
            user_id: user.id, 
            [supabaseColumnName]: cardData,
            // Assicurati che l'altra colonna abbia almeno un array vuoto
            [selectionType === 'have' ? 'what_i_want' : 'what_i_have']: []
          }]);

        if (insertError) {
          console.error(`Error inserting trade card for ${supabaseColumnName}:`, insertError);
          return;
        }
      }

      onCardsSelected(selectedTradeCards);

    } catch (err) {
      console.error("Error in handleDoneSelecting:", err);
    }
  };

  const closeModal = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
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
            <FastImage
              style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
              source={{ 
                uri: cachedCard.image,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable
              }}
              resizeMode={FastImage.resizeMode.contain}
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
          <FastImage
            style={[styles.cardImage, { borderColor: currentPalette.borderColor, width: '100%', height: undefined }]}
            source={{ 
              uri: item.image,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable
            }}
            resizeMode={FastImage.resizeMode.contain}
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
              <FastImage
                source={{ 
                  uri: selectedCard.image + "/low.webp",
                  priority: FastImage.priority.normal,
                  cache: FastImage.cacheControl.immutable
                }}
                style={styles.fullSizeCardImage}
                resizeMode={FastImage.resizeMode.contain}
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
        // Estrai il codice del set dalla cardId (ad esempio 'A2a' da 'A2a-001')
        const setCodeId = cardId.split('-')[0];
        
        // Cerca il set corrispondente
        const cardSet = sets.find(set => {
          // Ottieni il nome del set dal codice
          if (setCodeId === 'A1') return set.setName === "Genetic Apex";
          if (setCodeId === 'A1a') return set.setName === "Mythical Island";
          if (setCodeId === 'A2a') return set.setName === "Triumphant Light";
          if (setCodeId === 'A2') return set.setName === "Space-Time Smackdown";
          return false;
        });
        
        if (cardSet) {
          // Cerca la carta nel set
          const card = cardSet.cards.find(c => c.id === cardId);
          if (card && card.rarity) {
            // La carta ha già tutti i dati necessari
            cache.current[cardId] = card;
            setCardDetails(card);
            setLoading(false);
            return;
          }
        }
        
        // Se la carta non è stata trovata o non ha rarità, procedi con la richiesta API
        const cardDetailsUrl = `https://api.tcgdex.net/v2/en/cards/${cardId}`;
        const cardDetailsResponse = await fetch(cardDetailsUrl);

        if (!cardDetailsResponse.ok) {
          setError(`Failed to fetch card details for ${cardId}`);
          return;
        }

        const details = await cardDetailsResponse.json();
        
        // Determina la rarità della carta
        let rarity = "diamond"; // Default value
        // Per le carte dei nostri set, cerca la rarità nei file JSON
        const setCodeDetails = cardId.split('-')[0];
        // Cerca il set corrispondente
        const relevantSet = sets.find(set => {
          // Ottieni il nome del set dal codice
          if (setCodeDetails === 'A1') return set.setName === "Genetic Apex";
          if (setCodeDetails === 'A1a') return set.setName === "Mythical Island";
          if (setCodeDetails === 'A2a') return set.setName === "Triumphant Light";
          if (setCodeDetails === 'A2') return set.setName === "Space-Time Smackdown";
          return false;
        });
        
        if (relevantSet) {
          const cardInSet = relevantSet.cards.find(c => c.id === cardId);
          if (cardInSet && cardInSet.rarity) {
            rarity = cardInSet.rarity;
          }
        }
        
        const updatedCard = {
          id: details.id,
          name: details.name,
          image: details.image + "/low.webp",
          rarity: rarity
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
    <FastImage
      style={[styles.cardImage, { borderColor: currentPalette.borderColor }]}
      source={{ 
        uri: cardDetails.image,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable
      }}
      resizeMode={FastImage.resizeMode.contain}
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
});

export default TradeCardSelection;
