import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Icon from 'react-native-vector-icons/FontAwesome';

const DeckCard = React.memo(({ deckNumber, deckName, isSelected, onSelect, onEdit, onDelete }) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const cardScale = new Animated.Value(1);

  const animateCard = () => {
    Animated.timing(cardScale, {
      toValue: 0.95,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const resetCard = () => {
    Animated.timing(cardScale, {
      toValue: 1,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        style={[
          styles.deckCard,
          { backgroundColor: theme.cardBackground },
          isSelected && styles.selectedDeckCard,
        ]}
        onPress={onSelect}
        onPressIn={animateCard}
        onPressOut={resetCard}
        activeOpacity={1}
      >
        <Text style={[styles.deckCardText, { color: theme.text }]}>
          {deckName || `Deck #${deckNumber}`}
        </Text>
        <View style={styles.deckCardActions}>
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Icon name="pencil" size={16} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Icon name="trash" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const DeckList = React.memo(({ deckList, deckName, theme, visible, onClose }) => {
  if (!deckList) {
    return (
      <View style={styles.emptyDeckList}>
        <Text style={{ color: theme.text }}>No cards in this deck.</Text>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{deckName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.cardGrid}>
              {deckList.map((card, index) => (
                <View key={index} style={styles.cardGridItem}>
                  <Image
                    source={{ uri: card.image_url + "/low.webp" }}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.cardQuantityContainer}>
                    <Text style={[styles.cardQuantity, { color: theme.text }]}>x{card.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const AddDeckButton = ({ onPress }) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;

  return (
    <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={onPress}>
      <Text style={styles.addButtonText}>+</Text>
    </TouchableOpacity>
  );
};

const Decklistscreen = () => {
  const { isDarkMode, user } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const navigation = useNavigation();
  const [deckCount, setDeckCount] = useState(0);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckList, setDeckList] = useState(null);
  const [deckNames, setDeckNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingDeckList, setFetchingDeckList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeckListModalVisible, setIsDeckListModalVisible] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchDeckCount(), fetchDeckNames()]);
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh deck list.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchDeckCount, fetchDeckNames]);

  const fetchDeckCount = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to fetch deck count.');
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
      console.error('Error fetching deck count:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching deck count.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchDeckNames = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to fetch deck names.');
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
      console.error('Error fetching deck names:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching deck names.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeckCount();
    fetchDeckNames();
  }, [fetchDeckCount, fetchDeckNames]);

  const handleAddDeck = () => {
    navigation.navigate('MyDecks');
  };

  const handleDeckPress = async (deckNumber) => {
    if (selectedDeck === deckNumber) {
      setSelectedDeck(null);
      setIsDeckListModalVisible(false);
      return;
    }

    setSelectedDeck(deckNumber);
    if (!user) return;

    setFetchingDeckList(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`DECK_LIST_${deckNumber}`)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching deck list:', error);
        Alert.alert('Error', 'Failed to fetch deck list.');
        return;
      }

      if (profile && profile[`DECK_LIST_${deckNumber}`]) {
        const deck = JSON.parse(profile[`DECK_LIST_${deckNumber}`]);
        const cardCounts = {};
        deck.cards.forEach((card) => {
          cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
        });

        const countedDeckList = Object.entries(cardCounts).map(([id, quantity]) => {
          const card = deck.cards.find(c => c.id === id);
          return {
            id,
            quantity,
            image_url: card.image
          };
        });

        setDeckList(countedDeckList);
        setIsDeckListModalVisible(true);
      } else {
        setDeckList(null);
      }
    } catch (error) {
      console.error('Error parsing deck list:', error);
      Alert.alert('Error', 'An unexpected error occurred while parsing the deck list.');
    } finally {
      setFetchingDeckList(false);
    }
  };

  const handleDeleteDeck = async (deckNumber) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${deckNames[deckNumber] || `Deck #${deckNumber}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            if (!user) return;
            try {
              const updates = { [`DECK_LIST_${deckNumber}`]: null };
              const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

              if (error) {
                console.error('Error deleting deck:', error);
                Alert.alert('Error', 'Failed to delete the deck.');
                return;
              }
              await fetchDeckCount();
              await fetchDeckNames();
              setSelectedDeck(null);
              Alert.alert('Success', `${deckNames[deckNumber] || `Deck #${deckNumber}`} has been deleted.`);
            } catch (error) {
              console.error('Error deleting deck:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ],
    );
  };

  const handleEditDeck = (deckNumber) => {
    navigation.navigate('MyDecks', { deckNumber: deckNumber });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>My Deck Lists</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <ScrollView 
          style={styles.decksContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {deckCount > 0 ? (
            Array.from({ length: deckCount }, (_, i) => i + 1).map((deckNumber) => (
              <DeckCard
                key={deckNumber}
                deckNumber={deckNumber}
                deckName={deckNames[deckNumber]}
                isSelected={selectedDeck === deckNumber}
                onSelect={() => handleDeckPress(deckNumber)}
                onEdit={() => handleEditDeck(deckNumber)}
                onDelete={() => handleDeleteDeck(deckNumber)}
              />
            ))
          ) : (
            <Text style={[styles.noDecksText, { color: theme.text }]}>No decks saved yet.</Text>
          )}
        </ScrollView>
      )}

      <AddDeckButton onPress={handleAddDeck} />

      {fetchingDeckList ? (
        <View style={styles.deckListLoading}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <DeckList 
          deckList={deckList} 
          deckName={deckNames[selectedDeck]} 
          theme={theme}
          visible={isDeckListModalVisible}
          onClose={() => setIsDeckListModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  decksContainer: {
    marginBottom: 20,
  },
  deckCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedDeckCard: {
    borderColor: 'yellow',
    borderWidth: 2,
  },
  deckCardText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deckCardActions: {
    flexDirection: 'row',
  },
  editButton: {
    marginRight: 10,
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
  },
  deckListLoading: {
    marginTop: 10,
    alignItems: 'center',
  },
  emptyDeckList: {
    padding: 20,
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
    padding: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    flex: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 5,
  },
  cardGridItem: {
    width: '33%',
    aspectRatio: 3/4,
    marginBottom: 10,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardQuantityContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDecksText: {
    textAlign: 'center',
    marginTop: 20,
  },
  threeDButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  threeDButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Decklistscreen;
