import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Card } from 'react-native-elements';
import { EnergyIcon } from '../components/EnergyIcon';
import { useAuth } from '../hooks/useAuth';
import Constants from 'expo-constants';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
  max_players: number | null;
  start_date: string | null;
}

interface Participant {
  username: string;
  points: number;
  id: string;
  deck: { deck1: string[]; deck2: string[] } | null;
}

interface Match {
  id: string;
  player1: string;
  player1_id: string;
  player2: string;
  player2_id: string;
  winner_id: string | null;
  round: number;
  status: 'scheduled' | 'completed';
}

const TournamentDetailsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: string };
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    setLoading(true);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          points,
          id,
          deck,
          profiles:participant_id (username)
        `)
        .eq('tournament_id', id);
      if (participantsError) throw participantsError;
      setParticipants(participantsData.map(p => ({ username: p.profiles.username, points: p.points, id: p.id, deck: p.deck })) || []);

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          round,
          status,
          winner_id,
          player1_id,
          player2_id,
          player1:player1_id(username),
          player2:player2_id(username)
        `)
        .eq('tournament_id', id)
        .order('round', { ascending: true });
      if (matchesError) throw matchesError;
      setMatches(matchesData.map(m => ({ ...m, player1: m.player1.username, player2: m.player2.username })) || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (tournament?.max_players !== null && participants.length < tournament.max_players) {
      Alert.alert('Errore', 'Il torneo non ha raggiunto il numero massimo di partecipanti.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', id);
      if (error) throw error;
      fetchTournamentData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return <View style={styles.container}><Text>Caricamento...</Text></View>;
  }

  if (!tournament) {
    return <View style={styles.container}><Text>Torneo non trovato</Text></View>;
  }

  const isOwner = tournament.created_by === user?.id;
  const isTournamentActive = tournament.status === 'in_progress' || tournament.status === 'completed';
  const paddingTop = Platform.OS === 'android' ? Constants.statusBarHeight : 0;
  const availableSlots = tournament.max_players === null ? '∞' : tournament.max_players - participants.length;

  return (
    <ScrollView style={[styles.container, { paddingTop }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tournament.name}</Text>
        <Text style={styles.headerDescription}>{tournament.description}</Text>
        <Text style={styles.headerDate}>Created {new Date(tournament.created_at).toLocaleDateString()}</Text>
        {tournament.start_date && (
            <Text style={styles.headerDate}>Start Date: {new Date(tournament.start_date).toLocaleDateString()}</Text>
        )}
        <Text style={[styles.headerStatus, {
          backgroundColor: tournament.status === 'completed' ? 'green' : tournament.status === 'in_progress' ? 'yellow' : 'gray',
        }]}>
          {tournament.status.replace('_', ' ')}
        </Text>
        {tournament.max_players !== null && (
          <Text style={styles.headerMaxPlayers}>
            {participants.length}/{tournament.max_players === null ? '∞' : tournament.max_players}
          </Text>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.content}>
        {isOwner && tournament.status === 'draft' && (
          <TouchableOpacity onPress={handleStartTournament} style={styles.startButton} disabled={tournament.max_players !== null && participants.length < tournament.max_players}>
            <Text style={styles.startButtonText}>Inizia Torneo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('ManageParticipants', { id: id })} style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Gestisci Partecipanti</Text>
        </TouchableOpacity>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partecipanti</Text>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantItem}>
              <Text style={styles.participantName}>{participant.username} ({participant.points} punti)</Text>
              {participant.deck && (
                <View style={styles.deckContainer}>
                  <Text>Deck 1: {participant.deck.deck1.map((e) => <EnergyIcon key={e} energy={e} style={styles.energyIcon} />)}</Text>
                  <Text>Deck 2: {participant.deck.deck2.map((e) => <EnergyIcon key={e} energy={e} style={styles.energyIcon} />)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partite</Text>
          {matches.map((match) => (
            <View key={match.id} style={styles.matchItem}>
              <Text>Round {match.round}</Text>
              <Text>
                {match.player1} vs {match.player2}
              </Text>
              {match.winner_id && <Text>Vincitore: {match.winner_id}</Text>}
              <Text>Status: {match.status}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
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
  headerDescription: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  headerStatus: {
    padding: 5,
    borderRadius: 5,
    color: 'white',
    fontSize: 14,
  },
  headerMaxPlayers: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  participantItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  participantName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  deckContainer: {
    flexDirection: 'column',
    marginLeft: 10,
  },
  energyIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  matchItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#95a5a6',
    padding: 10,
    borderRadius: 5,
    display: 'none',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
  },
  manageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  startText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default TournamentDetailsScreen;
