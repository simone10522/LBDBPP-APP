import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, SafeAreaView, Animated, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { BannerAdComponent } from '../components/BannerAdComponent';

const MyDecksScreen = () => {
  const { colors } = useTheme();
  const [currentDeck, setCurrentDeck] = useState([]);
  const [deckError, setDeckError] = useState('');
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [animatedValue, setAnimatedValue] = useState(new Animated.Value(0));

  const currentPalette = colors;
  const isDarkMode = colors.dark;

  const openSaveModal = () => {
    setIsSaveModalVisible(true);
  };

  const closeSaveModal = () => {
    setIsSaveModalVisible(false);
  };

  const handleSaveDeck = () => {
    // Implementation of handleSaveDeck
  };

  const removeCardFromDeck = (card) => {
    // Implementation of removeCardFromDeck
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <View key={item.id} style={styles.deckCardItem}>
      <Text style={{ color: currentPalette.text }}>
        {item.name} {item.count > 1 ? `X${item.count}` : ''}
      </Text>
      <TouchableOpacity onPress={() => removeCardFromDeck(item)}>
        <Text style={{ color: 'red', marginLeft: 10, fontWeight: 'bold' }}>X</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={{ color: currentPalette.text, margin: 10 }}>
        Deck Count: {currentDeck.length} / 20
      </Text>
      {deckError && <Text style={{ color: 'red', margin: 10 }}>{deckError}</Text>}

      <FlatList
        data={Object.values(currentDeck.reduce((acc, card) => {
          if (!acc[card.id]) {
            acc[card.id] = { ...card, count: 0 };
          }
          acc[card.id].count += 1;
          return acc;
        }, {}))}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={{ maxHeight: 200, margin: 10 }}
      />

      {
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: currentPalette.saveButton }]}
          onPress={openSaveModal}
        >
          <Text style={styles.saveButtonText}>Save Deck</Text>
        </TouchableOpacity>
      }

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
                source={{ uri: selectedCard.image + "/low.webp" }}
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  saveButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  deckNameInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deckCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  bannerAdContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  fullSizeCardImage: {
    width: '100%',
    height: '100%',
  },
};

export default MyDecksScreen; 