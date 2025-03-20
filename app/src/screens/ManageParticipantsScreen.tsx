import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ParticipantList from '../components/ParticipantList';
import { EnergyIcon } from '../components/EnergyIcon';
import { lightPalette, darkPalette } from '../context/themes';

type Energy = 'fuoco' | 'terra' | 'acqua' | 'elettro' | 'normale' | 'erba' | 'oscurità' | 'lotta' | 'acciaio' | 'psico';

interface TournamentParticipant {
  id: string;
  username: string;
  deck: { deck1: Energy[]; deck2: Energy[] } | null;
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
          deck
        `)
        .eq('tournament_id', id);

      if (error) {
        throw new Error(`Errore durante il recupero dei partecipanti: ${error.message}`);
      }

      if (data) {
        setTournamentParticipants(
          data.map((p) => ({
            id: p.id,
            username: p.profiles.username,
            deck: p.deck,
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

  const formatDeck = (deck: { deck1: Energy[]; deck2: Energy[] } | null): React.ReactNode => {
    if (!deck) return 'Non selezionato';
    return (
      <>
        Deck 1: {deck.deck1.map((e) => <EnergyIcon key={e} energy={e} style={styles.energyIcon} />)}{' '}
        Deck 2: {deck.deck2.map((e) => <EnergyIcon key={e} energy={e} style={styles.energyIcon} />)}
      </>
    );
  };

  const isTournamentActive = tournamentStatus === 'in_progress' || tournamentStatus === 'completed';


  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.headerBackground }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Lista Partecipanti</Text>
        <Text style={[styles.headerSubTitle, { color: palette.secondaryText }]}>
          ({tournamentParticipants.length}/{maxPlayers === null ? '∞' : maxPlayers})
        </Text>
      </View>
      {error && <Text style={[styles.error, { color: palette.errorText }]}>{error}</Text>}
      {loading && <Text style={{ color: palette.text }}>Caricamento...</Text>}
      {user && (
        <View style={styles.actions}>
          {isParticipating && (
            <TouchableOpacity onPress={handleLeaveTournament} style={[styles.leaveButton, { backgroundColor: palette.buttonBackground }]} disabled={isTournamentActive}>
              <Text style={[styles.leaveButtonText, { color: palette.buttonText }]}>Esci dal Torneo</Text>
            </TouchableOpacity>
          )}
          {isParticipating && participantId && (
            <TouchableOpacity onPress={() => navigation.navigate('ManageDecks', { participantId: participantId })} style={[styles.manageDeckButton, { backgroundColor: palette.buttonBackground }]} disabled={isTournamentActive}>
              <Text style={[styles.manageDeckButtonText, { color: palette.buttonText }]}>Gestisci Mazzi</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.listContainer}>
        {tournamentParticipants.map((p) => (
          <View key={p.id} style={[styles.listItem, { backgroundColor: palette.rowBackground, borderColor: palette.borderColor }]}>
            <Text style={[styles.listItemText, { color: palette.text }]}>{p.username}</Text>
            <Text style={[styles.listItemText, { color: palette.text }]}>{formatDeck(p.deck)}</Text>
            {tournament?.created_by === user?.id && (
              <TouchableOpacity onPress={() => handleRemoveParticipant(p.id)} style={[styles.removeButton, { backgroundColor: palette.buttonBackground }]}>
                <Text style={[styles.removeButtonText, { color: palette.buttonText }]}>Rimuovi</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#ddd',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textShadowColor: 'black',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  headerSubTitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  leaveButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  leaveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  manageDeckButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
  },
  manageDeckButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0.1,
    elevation: 0.1,
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    padding: 5,
    borderRadius: 5,
    alignSelf: 'flex-end',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#95a5a6',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    display: 'none',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  energyIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  headerBackground: {
    backgroundColor: '#ddd', // Default light mode header background
  },
  rowBackground: {
    backgroundColor: 'white', // Default light mode row background
  }
});
