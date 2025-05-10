import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import cardDataSetsA2a from '../../assets/cards/modified/A2a.json';
import cardDataSetsA1 from '../../assets/cards/modified/A1.json';
import cardDataSetsA1a from '../../assets/cards/modified/A1a.json';
import cardDataSetsA2 from '../../assets/cards/modified/A2.json';
import cardDataSetsA2b from '../../assets/cards/modified/A2b.json';
import { Undo2 } from 'lucide-react-native';
import Accordion from './Accordion';
import cardImages from './cardImages'; // importa le immagini
import rarityCrown from '../../assets/rarity_icons/crown.png';
import rarityOneStar from '../../assets/rarity_icons/one_star.png';
import rarityTwoStar from '../../assets/rarity_icons/two_star.png';
import rarityThreeStar from '../../assets/rarity_icons/three_star.png';
import rarityOneDiamond from '../../assets/rarity_icons/one_diamond.png';
import rarityTwoDiamond from '../../assets/rarity_icons/two_diamond.png';
import rarityThreeDiamond from '../../assets/rarity_icons/three_diamond.png';
import rarityFourDiamond from '../../assets/rarity_icons/four_diamond.png';
import rarityOneShiny from '../../assets/rarity_icons/one_shiny.png';
import rarityTwoShiny from '../../assets/rarity_icons/two_shiny.png';
import SideMenu from 'react-native-side-menu-updated';

const sets = [
  { setName: "Genetic Apex", cards: cardDataSetsA1 },
  { setName: "Mythical Island", cards: cardDataSetsA1a },
  { setName: "Triumphant Light", cards: cardDataSetsA2a },
  { setName: "Space-Time Smackdown", cards: cardDataSetsA2 },
  { setName: "Shining Revelry", cards: cardDataSetsA2b }
];

const rarityOptions = [
  { label: 'All', value: '' },
  { label: 'Crown', value: 'crown' },
  { label: 'One Star', value: 'one star' },
  { label: 'Two Star', value: 'two star' },
  { label: 'Three Star', value: 'three star' },
  { label: 'One Diamond', value: 'one diamond' },
  { label: 'Two Diamond', value: 'two diamond' },
  { label: 'Three Diamond', value: 'three diamond' },
  { label: 'Four Diamond', value: 'four diamond' },
  { label: 'One Shiny', value: 'one shiny' },
  { label: 'Two Shiny', value: 'two shiny' },
];

// Solo le rarità visibili
const visibleRarityOptions = [
  { label: 'One Star', value: 'one star', icon: rarityOneStar },
  { label: 'One Diamond', value: 'one diamond', icon: rarityOneDiamond },
  { label: 'Two Diamond', value: 'two diamond', icon: rarityTwoDiamond },
  { label: 'Three Diamond', value: 'three diamond', icon: rarityThreeDiamond },
  { label: 'Four Diamond', value: 'four diamond', icon: rarityFourDiamond },
];

const TradeCardSelection = ({ onCardsSelected, isDarkMode, onBack, selectionType }) => {
  const [selectedSetIndex, setSelectedSetIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedTradeCards, setSelectedTradeCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [showGrid, setShowGrid] = useState(true); // nuovo stato per il toggle
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState('');

  const currentPalette = isDarkMode ? darkPalette : lightPalette;
  const { user } = useAuth();

  // Carica la lista delle carte selezionate da Supabase all'avvio
  useEffect(() => {
    const loadCardsFromSupabase = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const columnName = selectionType === 'have' ? 'what_i_have' : 'what_i_want';
        const { data, error } = await supabase
          .from('trade_cards')
          .select(columnName)
          .eq('user_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') {
          setCardError(error.message);
          return;
        }
        if (data && data[columnName]) {
          setSelectedTradeCards(data[columnName].map(card => ({ ...card, count: card.count || 1 })));
        }
      } catch (err) {
        setCardError("Error loading cards");
      } finally {
        setLoading(false);
      }
    };
    loadCardsFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectionType]);

  // Lista delle rarità da escludere
  const excludedRarities = [
    'two star',
    'three star',
    'crown',
    'one shiny',
    'two shiny'
  ];

  // Filtra carte del set selezionato
  const filteredCards = sets[selectedSetIndex].cards.filter(card => {
    const rarity = card.rarity ? card.rarity.toLowerCase() : '';
    const isExcluded = excludedRarities.some(r => rarity.includes(r));
    return (
      !isExcluded &&
      (!selectedRarity || rarity.includes(selectedRarity)) &&
      (!searchText || (card.name && card.name.toLowerCase().includes(searchText.toLowerCase())))
    );
  });

  const handleCardPress = (card) => {
    setCardError(null);
    const existingCardIndex = selectedTradeCards.findIndex(selectedCard => selectedCard.id === card.id);
    if (existingCardIndex > -1) {
      const updatedSelectedCards = [...selectedTradeCards];
      updatedSelectedCards[existingCardIndex].count = (updatedSelectedCards[existingCardIndex].count || 1) + 1;
      setSelectedTradeCards(updatedSelectedCards);
    } else {
      setSelectedTradeCards([...selectedTradeCards, { ...card, count: 1 }]);
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
    if (!user) return;
    setLoading(true);
    const supabaseColumnName = selectionType === 'have' ? 'what_i_have' : 'what_i_want';
    try {
      const cardData = selectedTradeCards.map(card => ({
        id: card.id,
        name: card.name,
        count: card.count,
      })) || [];
      const { data: existingTradeCard, error: selectError } = await supabase
        .from('trade_cards')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (selectError && selectError.code !== 'PGRST116') return;
      if (existingTradeCard) {
        await supabase
          .from('trade_cards')
          .update({ [supabaseColumnName]: cardData })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('trade_cards')
          .insert([{ 
            user_id: user.id, 
            [supabaseColumnName]: cardData,
            [selectionType === 'have' ? 'what_i_want' : 'what_i_have']: []
          }]);
      }
      onCardsSelected(selectedTradeCards);
    } catch (err) {
      setCardError("Error saving cards");
    } finally {
      setLoading(false);
    }
  };

  const renderCardItem = ({ item }) => {
    const isSelected = selectedTradeCards.some(selectedCard => selectedCard.id === item.id);
    const selectedItem = selectedTradeCards.find(selectedCard => selectedCard.id === item.id);
    const cardCount = selectedItem ? selectedItem.count : 0;
    return (
      <View style={styles.cardItemRow}>
        <View style={styles.cardInfoContainer}>
          <Text style={[styles.cardIdText, { color: currentPalette.text }]}>{item.id}</Text>
          <Text style={[styles.cardNameText, { color: currentPalette.text }]}>{item.name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: 'green', position: 'relative', left: 0, bottom: 0 }]}
          onPress={() => handleCardPress(item)}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
        {isSelected && (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: 'red', position: 'relative', left: 0, bottom: 0 }]}
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
      </View>
    );
  };

  // Funzione di mapping rarity -> icona
  const getRarityIcon = (rarity) => {
    if (!rarity) return null;
    const r = rarity.toLowerCase();
    if (r.includes('crown')) return rarityCrown;
    if (r.includes('one star')) return rarityOneStar;
    if (r.includes('two star')) return rarityTwoStar;
    if (r.includes('three star')) return rarityThreeStar;
    if (r.includes('one diamond')) return rarityOneDiamond;
    if (r.includes('two diamond')) return rarityTwoDiamond;
    if (r.includes('three diamond')) return rarityThreeDiamond;
    if (r.includes('four diamond')) return rarityFourDiamond;
    if (r.includes('one shiny')) return rarityOneShiny;
    if (r.includes('two shiny')) return rarityTwoShiny;
    return null;
  };

  const getRarityIconSize = (rarity) => {
    if (!rarity) return { width: 28, height: 28 };
    const r = rarity.toLowerCase();
    if (r.includes('crown')) return { width: 36, height: 36 };
    if (r.includes('one diamond')) return { width: 20, height: 20 };
    if (r.includes('two diamond')) return { width: 38, height: 38 };
    if (r.includes('three diamond')) return { width: 58, height: 58 };
    if (r.includes('four diamond')) return { width: 78, height: 78 };
    if (r.includes('star')) return { width: 24, height: 24 };
    if (r.includes('shiny')) return { width: 32, height: 32 };
    return { width: 28, height: 28 };
  };

  const getRarityIconStyle = (rarity) => {
    const size = getRarityIconSize(rarity);
    // Calcola un offset negativo per centrare la base dell’icona
    let bottom = 4;
    if (size.height > 28) bottom = -((size.height - 28) / 2);
    return {
      position: 'absolute',
      left: 8,
      bottom,
      width: size.width,
      height: size.height,
      zIndex: 3,
    };
  };

  // Render per la griglia con immagini
  const renderCardGridItem = ({ item }) => {
    const isSelected = selectedTradeCards.some(selectedCard => selectedCard.id === item.id);
    const selectedItem = selectedTradeCards.find(selectedCard => selectedCard.id === item.id);
    const cardCount = selectedItem ? selectedItem.count : 0;
    const rarityIcon = getRarityIcon(item.rarity);
    const rarityIconSize = getRarityIconSize(item.rarity);
    return (
      <View style={styles.cardGridItem}>
        <TouchableOpacity onPress={() => handleCardPress(item)}>
          <View>
            {cardImages[item.id] && (
              <View style={styles.cardImageWrapper}>
                <Image
                  source={cardImages[item.id]}
                  style={{ width: 120, height: 168, borderRadius: 8 }}
                  resizeMode="contain"
                />
                {rarityIcon && (
                  <Image
                    source={rarityIcon}
                    style={getRarityIconStyle(item.rarity)}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}
            {cardCount > 0 && (
              <View style={styles.countBadgeGrid}>
                <Text style={styles.countText}>{cardCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {isSelected && (
          <TouchableOpacity style={styles.removeButtonGrid} onPress={() => handleRemoveCard(item)}>
            <Text style={styles.buttonText}>-</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Aggiungi una versione grid anche per le carte selezionate
  const renderSelectedGridItem = ({ item }) => {
    const rarityIcon = getRarityIcon(item.rarity);
    const rarityIconSize = getRarityIconSize(item.rarity);
    return (
      <View style={styles.cardGridItem}>
        <View>
          {cardImages[item.id] && (
            <View style={styles.cardImageWrapper}>
              <Image
                source={cardImages[item.id]}
                style={{ width: 120, height: 168, borderRadius: 8 }}
                resizeMode="contain"
              />
              {rarityIcon && (
                <Image
                  source={rarityIcon}
                  style={getRarityIconStyle(item.rarity)}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
          {item.count > 0 && (
            <View style={styles.countBadgeGrid}>
              <Text style={styles.countText}>{item.count}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.removeButtonGrid} onPress={() => handleRemoveCard(item)}>
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectedItem = ({ item }) => (
    <View style={styles.cardItemRow}>
      <View style={styles.cardInfoContainer}>
        <Text style={[styles.cardIdText, { color: currentPalette.text }]}>{item.id}</Text>
        <Text style={[styles.cardNameText, { color: currentPalette.text }]}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: 'red', position: 'relative', left: 0, bottom: 0 }]}
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
  );

  const CARD_HEIGHT = 337; // altezza della card + padding/margin
  const NUM_COLUMNS = 3;

  // Menu laterale per il filtro rarità (verticale)
  const filterMenu = (
    <View style={{
      flex: 1,
      backgroundColor: currentPalette.background,
      paddingTop: 60,
      paddingHorizontal: 20,
    }}>
      <ScrollView horizontal={false} contentContainerStyle={{ flexDirection: 'column', alignItems: 'center' }}>
        {/* Pulsante per mostrare tutte le carte */}
        <TouchableOpacity
          style={{
            padding: 14,
            margin: 8,
            borderRadius: 8,
            borderWidth: selectedRarity === '' ? 2 : 0,
            borderColor: selectedRarity === '' ? currentPalette.buttonBackground : 'transparent',
            backgroundColor: selectedRarity === '' ? currentPalette.buttonBackground : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            width: 60,
            height: 60,
          }}
          onPress={() => {
            setSelectedRarity('');
            setIsSideMenuOpen(false);
          }}
        >
          <Text style={{ fontSize: 18, color: currentPalette.text, fontWeight: 'bold' }}>All</Text>
        </TouchableOpacity>
        {visibleRarityOptions.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={{
              padding: 14,
              margin: 8,
              borderRadius: 8,
              borderWidth: selectedRarity === opt.value ? 2 : 0,
              borderColor: selectedRarity === opt.value ? currentPalette.buttonBackground : 'transparent',
              backgroundColor: selectedRarity === opt.value ? currentPalette.buttonBackground : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
            }}
            onPress={() => {
              setSelectedRarity(opt.value);
              setIsSideMenuOpen(false);
            }}
          >
            <Image
              source={opt.icon}
              style={{ width: 36, height: 36, marginBottom: 2 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={{
          marginTop: 24,
          alignSelf: 'center',
          paddingHorizontal: 24,
          paddingVertical: 10,
          borderRadius: 5,
          backgroundColor: currentPalette.buttonBackground,
        }}
        onPress={() => setIsSideMenuOpen(false)}
      >
        <Text style={{ color: currentPalette.buttonText, fontWeight: 'bold' }}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SideMenu
      menu={filterMenu}
      isOpen={isSideMenuOpen}
      onChange={setIsSideMenuOpen}
      menuPosition="right" // Cambia in "left" per aprire da sinistra
      openMenuOffset={110} // Larghezza del menu aperto (default 280)
      hiddenMenuOffset={0} // Offset del menu nascosto
      bounceBackOnOverdraw={false} // Disabilita effetto rimbalzo
      disableGestures={false} // Disabilita swipe per aprire/chiudere
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
        <Text style={[styles.selectionText, { color: currentPalette.text }]}>
          {selectionType === 'have' ? 'My Cards' : 'I Want'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 5 }}>
          <Text style={{ color: currentPalette.text, marginRight: 8 }}>Set:</Text>
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
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 5,
              backgroundColor: showGrid ? currentPalette.buttonBackground : (isDarkMode ? '#222' : '#eee'),
              marginLeft: 8,
            }}
            onPress={() => setShowGrid(!showGrid)}
          >
            <Text style={{
              color: showGrid ? currentPalette.buttonText : (isDarkMode ? '#ccc' : '#222'),
              fontWeight: showGrid ? 'bold' : 'normal'
            }}>
              {showGrid ? 'List' : 'Grid'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Barra di ricerca + filtro */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 }}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: currentPalette.inputBackground,
                borderColor: currentPalette.borderColor,
                color: currentPalette.text,
                flex: 1,
                marginRight: 8,
              }
            ]}
            placeholder="Search for cards..."
            placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 5,
              backgroundColor: currentPalette.buttonBackground,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setIsSideMenuOpen(true)}
          >
            <Text style={{ color: currentPalette.buttonText, fontWeight: 'bold' }}>Filter</Text>
          </TouchableOpacity>
        </View>

        <Accordion title="Cards">
          {loading ? (
            <ActivityIndicator size="large" color={currentPalette.text} />
          ) : (
            <FlatList
              data={filteredCards}
              renderItem={showGrid ? renderCardGridItem : renderCardItem}
              keyExtractor={(card) => card.id}
              numColumns={showGrid ? 3 : 1}
              key={showGrid ? 'grid' : 'list'} // <--- AGGIUNGI QUESTA RIGA
              contentContainerStyle={[
                showGrid ? styles.cardGridContainer : styles.cardListContainer,
                { paddingBottom: 350 } // <--- aggiungi padding extra in fondo
              ]}
              initialNumToRender={showGrid ? 12 : 20}
              maxToRenderPerBatch={showGrid ? 12 : 20}
              windowSize={5}
              removeClippedSubviews={true}
              ListFooterComponent={<View style={{ height: 40 }} />} // <--- ulteriore sicurezza
              getItemLayout={(data, index) => {
                const row = Math.floor(index / NUM_COLUMNS);
                return {
                  length: CARD_HEIGHT,
                  offset: CARD_HEIGHT * row,
                  index,
                };
              }}
            />
          )}
        </Accordion>
        <Accordion title="Selected Cards">
          <FlatList
            data={selectedTradeCards}
            renderItem={showGrid ? renderSelectedGridItem : renderSelectedItem}
            keyExtractor={(card) => card.id}
            numColumns={showGrid ? 3 : 1}
            key={showGrid ? 'grid-selected' : 'list-selected'}
            contentContainerStyle={[
              showGrid ? styles.cardGridContainer : styles.cardListContainer,
              { paddingBottom: 100 }
            ]}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
          <Text style={{ color: currentPalette.text, margin: 10, textAlign: 'center' }}>
            Total Selected Cards: {selectedTradeCards.reduce((sum, card) => sum + (card.count || 0), 0)}
          </Text>
          {cardError && <Text style={{ color: 'red', margin: 10, textAlign: 'center' }}>{cardError}</Text>}
        </Accordion>
        <View style={[styles.buttonContainer, { backgroundColor: currentPalette.background }]}>
          <TouchableOpacity
            style={[styles.doneButtonOverlay, { backgroundColor: currentPalette.buttonBackground }]}
            onPress={handleDoneSelecting}
            disabled={loading}
          >
            <Text style={[styles.doneButtonText, { color: currentPalette.buttonText }]}>Save List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.undoButton, { backgroundColor: currentPalette.buttonBackground }]}
            onPress={onBack}
          >
            <View style={{ width: 24, height: 24 }}>
              <Undo2 color={currentPalette.buttonText} size={24} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SideMenu>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 5,
  },
  setPickerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    marginRight: 6,
    // backgroundColor impostato dinamicamente
  },
  searchInput: {
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 6,
  },
  cardListContainer: {
    paddingBottom: 20,
  },
  cardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  cardInfoContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  cardIdText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardNameText: {
    fontSize: 14,
  },
  selectButton: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    marginLeft: 8,
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
  countBadge: {
    marginLeft: 8,
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
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    zIndex: 100,
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
  cardGridContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cardGridItem: {
    flexBasis: '35%', // Occupa circa un terzo della larghezza
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 2,
    padding: 2,
    margin: 1, // Margine ridotto per avvicinare le carte
    minWidth: 0, // Permette il ridimensionamento
    maxWidth: '33%',
    position: 'relative',
  },
  cardImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    position: 'relative', // aggiungi questa riga!
  },
  removeButtonGrid: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  countBadgeGrid: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'blue',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  rarityIcon: {
    position: 'absolute',
    left: 2,
    bottom: 8,
    width: 28,
    height: 28,
    zIndex: 3,
  },
});

export default TradeCardSelection;
