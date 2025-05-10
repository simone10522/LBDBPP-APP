import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../../context/themes';
import { useAuth } from '../../hooks/useAuth';
import cardDataSetsA1 from '../../../assets/cards/modified/A1.json';
import cardDataSetsA1a from '../../../assets/cards/modified/A1a.json';
import cardDataSetsA2a from '../../../assets/cards/modified/A2a.json';
import cardDataSetsA2 from '../../../assets/cards/modified/A2.json';
import cardDataSetsA2b from '../../../assets/cards/modified/A2b.json';
import cardDataSetsA3 from '../../../assets/cards/modified/A3.json';
import A1list from '../../../assets/cards/boosterpack/A1list.json';
import A2list from '../../../assets/cards/boosterpack/A2list.json';
import A3list from '../../../assets/cards/boosterpack/A3list.json';
import BannerAdComponent from '../../components/BannerAd';
import { supabase } from '../../lib/supabase';
import Accordion from '../../components/Accordion';
import LinearGradient from 'react-native-linear-gradient';

// Funzione di mapping rarità -> icona
const rarityIconMap = {
  "One Diamond": require('../../../assets/rarity_icons/one_diamond.png'),
  "Two Diamond": require('../../../assets/rarity_icons/two_diamond.png'),
  "Three Diamond": require('../../../assets/rarity_icons/three_diamond.png'),
  "Four Diamond": require('../../../assets/rarity_icons/four_diamond.png'),
  "One Star": require('../../../assets/rarity_icons/one_star.png'),
  "Two Star": require('../../../assets/rarity_icons/two_star.png'),
  "Three Star": require('../../../assets/rarity_icons/three_star.png'),
  "Crown": require('../../../assets/rarity_icons/crown.png'),
  "One Shiny": require('../../../assets/rarity_icons/one_shiny.png'),
  "Two Shiny": require('../../../assets/rarity_icons/two_shiny.png'),
};

const packBgColorMap = {
  // Genetic Apex
  charizard: 'rgba(171,0,11,0.5)', // rosso chiaro con opacità
  mewtwo: 'rgba(120,0,171,0.5)',   // viola chiaro con opacità
  pikachu: 'rgba(191,188,2,0.5)',  // giallo chiaro con opacità
  // Space-Time Smackdown
  dialga: 'rgba(33,150,243,0.5)',  // azzurro con opacità
  palkia: 'rgba(231,84,128,0.5)',  // rosa con opacità
  // Celestial Guardians
  solgaleo: 'rgba(255,152,0,0.5)', // arancione con opacità
  lunala: 'rgba(75,0,130,0.5)',    // viola scuro con opacità
};

const CardItem = React.memo(({ item, isOwned, onToggle, textColor }) => {
  const rarityIcon = rarityIconMap[item.rarity];

  // Ottieni tutti i pacchetti per la carta
  const packNames = getPackNamesForCard(item, item.setName);
  const colors = packNames
    .map(name => packBgColorMap[name])
    .filter(Boolean);

  let content = (
    <>
      <View style={styles.checkboxContainer}>
        <View style={[
          styles.checkbox,
          isOwned && styles.checkboxChecked,
        ]}>
          {isOwned && (
            <View style={styles.checkmark} />
          )}
        </View>
      </View>
      <Text
        style={[
          styles.cardText,
          { color: textColor, textShadowColor: '#000', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 2 }
        ]}
      >
        {item.id} - {item.name}
      </Text>
      {rarityIcon && (
        <Image
          source={rarityIcon}
          style={{ width: 24, height: 24, marginRight: 8 }}
          resizeMode="contain"
        />
      )}
    </>
  );

  // Se la carta è in più pacchetti, usa un gradiente
  if (colors.length > 1) {
    return (
      <LinearGradient
        colors={colors}
        style={styles.cardListItem}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => onToggle(item)}
          activeOpacity={0.7}
        >
          {content}
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // Altrimenti colore pieno
  const bgColor = colors.length === 1 ? colors[0] : '#fff';

  return (
    <TouchableOpacity
      style={[styles.cardListItem, { backgroundColor: bgColor }]}
      onPress={() => onToggle(item)}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.isOwned === nextProps.isOwned &&
    prevProps.textColor === nextProps.textColor;
});

const PackToPullScreen = ({ navigation }) => {
  const [setsData, setSetsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const { isDarkMode, user } = useAuth();
  const currentPalette = isDarkMode ? darkPalette : lightPalette;
  const flatListRef = useRef<FlatList>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [ownedCards, setOwnedCards] = useState(new Map());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOwnedCardsFromSupabase(); // Carica solo da Supabase
    fetchCardSets();
  }, []);

  useEffect(() => {
    if (searchText) {
      fetchCardSets();
    }
  }, [searchText]);

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
                rarity: card.rarity // assicurati che la rarità sia presente
              }))
            : cardDataSetsA1.map(card => ({
                ...card,
                setName: "Genetic Apex",
                cachedImage: card.image + "/low.webp",
                rarity: card.rarity
              }))
        },
        {
          setName: "Space-Time Smackdown",
          cards: cardDataSetsA2.cards
            ? cardDataSetsA2.cards.map(card => ({
                ...card,
                setName: "Space-Time Smackdown",
                cachedImage: card.image + "/low.webp",
                rarity: card.rarity
              }))
            : cardDataSetsA2.map(card => ({
                ...card,
                setName: "Space-Time Smackdown",
                cachedImage: card.image + "/low.webp",
                rarity: card.rarity
              }))
        },
        {
          setName: "Celestial Guardians",
          cards: cardDataSetsA3.cards
            ? cardDataSetsA3.cards.map(card => ({
                ...card,
                setName: "Celestial Guardians",
                cachedImage: card.image + "/low.webp",
                rarity: card.rarity
              }))
            : cardDataSetsA3.map(card => ({
                ...card,
                setName: "Celestial Guardians",
                cachedImage: card.image + "/low.webp",
                rarity: card.rarity
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

  const fetchOwnedCardsFromSupabase = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('cardpack')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const newOwnedCards = new Map();

      // Mappa expansionName a setCode
      const setCodeMap = {
        genetic_apex: 'A1',
        space_time_smackdown: 'A2',
        celestial_guardians: 'A3',
      };

      Object.entries(data || {}).forEach(([expansionName, expansion]) => {
        const setCode = setCodeMap[expansionName];
        if (expansion && typeof expansion === 'object' && !Array.isArray(expansion)) {
          Object.entries(expansion).forEach(([packName, pack]) => {
            if (pack?.cards) {
              pack.cards.forEach(card => {
                // Ricostruisci l'id completo come nella lista (es: "A3-001")
                const fullId = setCode && card.id ? `${setCode}-${card.id}` : card.id;
                const fullCard = {
                  id: fullId,
                  rarity: card.rarity,
                  setName: expansionName.split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                  pack: packName
                };
                newOwnedCards.set(fullId, fullCard);
              });
            }
          });
        }
      });

      setOwnedCards(newOwnedCards);
    } catch (error) {
      console.error('Error fetching cards from Supabase:', error);
      setOwnedCards(new Map());
    }
  };

  const handleCardToggle = useCallback((card) => {
    setOwnedCards(prev => {
      const next = new Map(prev);
      if (next.has(card.id)) {
        next.delete(card.id);
      } else {
        next.set(card.id, card);
      }
      return next;
    });
  }, []);

  const saveSelectedCards = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { data: existingData, error: fetchError } = await supabase
        .from('cardpack')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Funzione aggiornata: usa la lista pacchetti giusta per ogni set
      const groupCardsByPack = (cards, packList) => {
        const packGroups = {};
        Object.keys(packList).forEach(packName => {
          packGroups[packName] = { cards: [] };
        });
        cards.forEach(card => {
          const cardId = card.id.split('-').pop();
          Object.entries(packList).forEach(([packName, packData]) => {
            if (packData.cards.some(c => c.id === cardId)) {
              packGroups[packName].cards.push({
                id: cardId,
                rarity: card.rarity
              });
            }
          });
        });
        return packGroups;
      };

      const ownedCardsArr = Array.from(ownedCards.values());

      const updatedCards = {
        user_id: user.id,
        genetic_apex: groupCardsByPack(
          ownedCardsArr.filter(card => card.setName === "Genetic Apex"),
          A1list
        ),
        space_time_smackdown: groupCardsByPack(
          ownedCardsArr.filter(card => card.setName === "Space-Time Smackdown"),
          A2list
        ),
        celestial_guardians: groupCardsByPack(
          ownedCardsArr.filter(card => card.setName === "Celestial Guardians"),
          A3list
        ),
      };

      let data, error;
      if (existingData) {
        ({ data, error } = await supabase
          .from('cardpack')
          .update(updatedCards)
          .eq('user_id', user.id));
      } else {
        ({ data, error } = await supabase
          .from('cardpack')
          .insert([updatedCards]));
      }

      if (error) throw error;

    } catch (error) {
      console.error('Error saving cards:', error);
      Alert.alert('Error', 'Failed to save card selection');
    } finally {
      setIsSaving(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOwnedCardsFromSupabase();
      await fetchCardSets();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: currentPalette.inputBackground, borderColor: currentPalette.borderColor, color: currentPalette.text, flex: 1, marginRight: 8, marginBottom: 0 }
        ]}
        placeholder="Search for cards..."
        placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
        value={searchText}
        onChangeText={setSearchText}
      />
      <TouchableOpacity
        onPress={async () => {
          await saveSelectedCards();
          navigation.navigate('CalculatePull');
        }}
        style={[styles.calculateButton, isSaving && styles.saveButtonDisabled]}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? 'Saving...' : 'Best Pack to Open'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCardItem = useCallback(({ item }) => {
    const isOwned = ownedCards.has(item.id);
    return (
      <CardItem
        item={item}
        isOwned={isOwned}
        onToggle={handleCardToggle}
        textColor={currentPalette.text}
      />
    );
  }, [ownedCards, currentPalette.text, handleCardToggle]);

  const renderSetItem = ({ item }) => (
    <View style={styles.setContainer}>
      <Accordion 
        title={item.setName}
        titleStyle={styles.setLabel}
      >
        <FlatList
          data={item.cards}
          renderItem={renderCardItem}
          keyExtractor={(card) => card.id}
          numColumns={1}
          contentContainerStyle={styles.cardListContainer}
        />
      </Accordion>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.background }]}>
      {renderHeader()}
      {saveError && (
        <Text style={styles.errorMessage}>{saveError}</Text>
      )}
      

      {/* Cards grid */}
      {loading ? (
        <Text style={[styles.text, { color: currentPalette.text }]}>Loading cards...</Text>
      ) : error ? (
        <Text style={[styles.errorText, { color: currentPalette.text }]}>Error: {error}</Text>
      ) : (
        <FlatList
          ref={flatListRef}
          data={setsData}
          renderItem={renderSetItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2196F3']} // Android
              tintColor={currentPalette.text} // iOS
            />
          }
        />
      )}

      <View style={styles.bannerAdContainer}>
        <BannerAdComponent />
      </View>
    </SafeAreaView>
  );
};

function getPackNameForCard(card, setName) {
  let list = null;
  if (setName === "Genetic Apex") list = A1list;
  else if (setName === "Space-Time Smackdown") list = A2list;
  else if (setName === "Celestial Guardians") list = A3list;
  if (!list) return null;

  const cardId = card.id.split('-').pop();
  for (const [packName, packData] of Object.entries(list)) {
    if (packData.cards.some(c => c.id === cardId)) {
      return packName.toLowerCase();
    }
  }
  return null;
}

function getPackNamesForCard(card, setName) {
  let list = null;
  if (setName === "Genetic Apex") list = A1list;
  else if (setName === "Space-Time Smackdown") list = A2list;
  else if (setName === "Celestial Guardians") list = A3list;
  if (!list) return [];

  const cardId = card.id.split('-').pop();
  const packs = [];
  for (const [packName, packData] of Object.entries(list)) {
    if (packData.cards.some(c => c.id === cardId)) {
      packs.push(packName.toLowerCase());
    }
  }
  return packs;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    margin: 0, // rimosso margin per evitare spazi verticali
  },
  scrollViewContent: { paddingBottom: 20 },
  setContainer: {
    marginBottom: 0,
    marginHorizontal: 10,
  },
  setLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardListContainer: { justifyContent: 'flex-start' },
  cardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0, // assicurati che non ci sia padding
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
  },
  checkmark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
    marginLeft: 0,
    marginTop: 0,
  },
  cardText: {
    fontSize: 16,
    flex: 1,
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
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
    gap: 5,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  calculateButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#888',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorMessage: {
    color: 'red',
    textAlign: 'center',
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 5,
  },
});

export default PackToPullScreen;
