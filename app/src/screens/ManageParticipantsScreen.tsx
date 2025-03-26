import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { List as ListIcon } from 'lucide-react-native';

interface TournamentParticipant {
  id: string;
  username: string;
  deck_1: string[]; // Array of cards in deck_1
  deck_1_name: string; // Name of deck_1
  deck_2: string[]; // Array of cards in deck_2
  deck_2_name: string; // Name of deck_2
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
  max_players: number | null;
}

export default function ManageParticipantsScreen() {
  const { id } = useRoute().params as { id: string };
  const { user } = useAuth();
  const navigation = useNavigation();
  const [tournamentParticipants, setTournamentParticipants] = useState<TournamentParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [tournamentStatus, setTournamentStatus] = useState<'draft' | 'in_progress' | 'completed'>('draft');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<TournamentParticipant | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { isDarkMode } = useAuth();
  const palette = isDarkMode ? darkPalette : lightPalette;

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          profiles:participant_id (id, username),
          deck_1,
          deck_2
        `)
        .eq('tournament_id', id);

      if (data) {
        setTournamentParticipants(
          data.map((p) => ({
            id: p.id,
            username: p.profiles.username,
            deck_1: p.deck_1 ? JSON.parse(p.deck_1).cards : [], // Parse JSON and extract cards
            deck_1_name: p.deck_1 ? JSON.parse(p.deck_1).name : 'Deck 1', // Extract deck name
            deck_2: p.deck_2 ? JSON.parse(p.deck_2).cards : [], // Parse JSON and extract cards
            deck_2_name: p.deck_2 ? JSON.parse(p.deck_2).name : 'Deck 2', // Extract deck name
          }))
        );
      } else {
        setTournamentParticipants([]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error("Error fetching tournament:", error);
        setTournament(null);
      } else {
        setTournament(data);
        setTournamentStatus(data.status);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      setTournament(null);
    }
  };

  useEffect(() => {
    fetchParticipants();
    fetchMaxPlayers();
    checkIfParticipating();
    fetchTournament();
  }, [fetchParticipants, user]);

  const fetchMaxPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('max_players')
        .eq('id', id)
        .single();
      if (error) {
        console.error("Error fetching max players:", error);
        setMaxPlayers(null);
      } else {
        setMaxPlayers(data?.max_players);
      }
    } catch (error) {
      console.error("Error fetching max players:", error);
      setMaxPlayers(null);
    }
  };

  const checkIfParticipating = async () => {
    if (!user || !id) {
      setIsParticipating(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', id)
        .eq('participant_id', user.id)
        .single();
      if (error) {
        setIsParticipating(false);
        setParticipantId(null);
      } else {
        setIsParticipating(true);
        setParticipantId(data.id);
      }
    } catch (error) {
      console.error("Error checking participation:", error);
      setIsParticipating(false);
      setParticipantId(null);
    }
  };

  const handleJoinTournament = async () => {
    if (!user) {
      setError('Devi essere loggato per partecipare al torneo.');
      return;
    }

    if (maxPlayers !== null && tournamentParticipants.length >= maxPlayers) {
      setError('Il torneo ha raggiunto il numero massimo di partecipanti.');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .insert([{ tournament_id: id, participant_id: user.id }]);
      if (error) throw new Error(`Errore durante l'iscrizione: ${error.message}`);
      fetchParticipants();
      checkIfParticipating();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleLeaveTournament = async () => {
    if (!user || !id) {
      setError('Devi essere loggato per uscire dal torneo.');
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', id)
        .eq('participant_id', user.id);
      if (error) throw new Error(`Errore durante l'uscita dal torneo: ${error.message}`);
      fetchParticipants();
      checkIfParticipating();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', participantId);
      if (error) throw new Error(`Errore durante la rimozione del partecipante: ${error.message}`);
      fetchParticipants();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const isTournamentActive = tournamentStatus === 'in_progress' || tournamentStatus === 'completed';

  const openModal = (participant: TournamentParticipant) => {
    setSelectedParticipant(participant);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedParticipant(null);
    setIsModalVisible(false);
  };

  const renderDeckList = (deck: string[], title: string) => (
    <View style={styles.deckContainer}>
      <Text style={[styles.deckTitle, { color: palette.text }]}>{title}</Text>
      {deck.length > 0 ? (
        <FlatList
          data={deck}
          keyExtractor={(item, index) => `${item}-${index}`}
          numColumns={5}
          renderItem={({ item }) => (
            <View style={styles.cardGridItem}>
              <Image
                source={{ uri: item }}
                style={styles.cardImage}
                resizeMode="contain"
              />
            </View>
          )}
        />
      ) : (
        <Text style={[styles.emptyDeckText, { color: palette.text }]}>Nessuna carta</Text>
      )}
    </View>
  );

  const groupCardsById = (deck) => {
    const grouped = {};
    deck.forEach((card) => {
      if (grouped[card.id]) {
        grouped[card.id].quantity += 1;
      } else {
        grouped[card.id] = { ...card, quantity: 1 };
      }
    });
    return Object.values(grouped);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Lista Partecipanti</Text>
        <Text style={[styles.headerSubTitle, { color: palette.text }]}>
          ({tournamentParticipants.length}/{maxPlayers === null ? '∞' : maxPlayers})
        </Text>
      </View>
      {error && <Text style={[styles.error, { color: palette.error }]}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color={palette.text} />
      ) : (
        <View style={styles.listContainer}>
          {tournamentParticipants.map((p) => (
            <View
              key={p.id}
              style={[
                styles.listItem,
                { backgroundColor: palette.cardBackground, borderColor: palette.borderColor },
              ]}
            >
              <Text style={[styles.listItemText, { color: palette.text }]}>{p.username}</Text>
              <View style={styles.actionButtonsContainer}>
                {tournament?.created_by === user?.id && !isTournamentActive && (
                  <TouchableOpacity 
                    onPress={() => handleRemoveParticipant(p.id)} 
                    style={[styles.removeButton]}
                  >
                    <Text style={[styles.buttonText, { color: palette.buttonText }]}>Rimuovi</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => openModal(p)} 
                  style={styles.listIconButton}
                >
                  <ListIcon color={palette.buttonText} size={24} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal for Decks */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {selectedParticipant?.username}'s Decks
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: palette.buttonText }]}>Chiudi</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.deckSection}>
                <Text style={[styles.deckSectionTitle, { color: palette.text }]}>
                  {selectedParticipant?.deck_1_name || 'Deck 1'}
                </Text>
                <View style={styles.cardGrid}>
                  {groupCardsById(selectedParticipant?.deck_1 || []).map((card, index) => (
                    <View key={index} style={styles.cardGridItem}>
                      <Image
                        source={{ uri: card.cachedImage }}
                        style={styles.cardImage}
                        resizeMode="contain"
                      />
                      {card.quantity > 1 && (
                        <View style={styles.cardQuantityContainer}>
                          <Text style={styles.cardQuantity}>x{card.quantity}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.deckSection}>
                <Text style={[styles.deckSectionTitle, { color: palette.text }]}>
                  {selectedParticipant?.deck_2_name || 'Deck 2'}
                </Text>
                <View style={styles.cardGrid}>
                  {groupCardsById(selectedParticipant?.deck_2 || []).map((card, index) => (
                    <View key={index} style={styles.cardGridItem}>
                      <Image
                        source={{ uri: card.cachedImage }}
                        style={styles.cardImage}
                        resizeMode="contain"
                      />
                      {card.quantity > 1 && (
                        <View style={styles.cardQuantityContainer}>
                          <Text style={styles.cardQuantity}>x{card.quantity}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubTitle: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  joinButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  leaveButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ff4d4f'
  },
  listIconButton: {
    marginLeft: 8,
    padding: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  error: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    width: '23%',
    aspectRatio: 3 / 4,
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
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardQuantityContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cardQuantity: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  deckSection: {
    marginBottom: 20,
  },
  deckSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});