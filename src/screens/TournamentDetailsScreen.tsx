import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import MatchList from '../components/MatchList';
import ParticipantList from '../components/ParticipantList';
import { Trash2, Edit } from 'lucide-react';
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
  deck: any;
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

export default function TournamentDetailsScreen() {
  const { id } = useRoute().params as { id: string };
  const { user } = useAuth();
  const navigation = useNavigation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
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
    try {
      // Check if all participants have decks
      const participantsWithoutDecks = participants.filter(p => !p.deck || !p.deck.deck1 || p.deck.deck1.length === 0 || !p.deck.deck2 || p.deck.deck2.length === 0);
      if (participantsWithoutDecks.length > 0) {
        const names = participantsWithoutDecks.map(p => p.username).join(', ');
        setError(`Giocatore ${names} non ha selezionato i deck`);
        return;
      }

      if (tournament?.max_players !== null && participants.length < tournament.max_players) {
        const missingPlayers = tournament.max_players - participants.length;
        setError(`Mancano ${missingPlayers} giocatori per avviare il torneo`);
        return;
      }

      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', id);
      if (error) throw error;

      // Call the function to generate matches
      const { error: generateMatchesError } = await supabase.rpc('generate_tournament_matches', {
        tournament_id_param: id,
      });
      if (generateMatchesError) throw generateMatchesError;

      fetchTournamentData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSetWinner = async (matchId: string, winnerId: string) => {
    try {
      // 1. Update the match with the winner
      const { error: matchError } = await supabase
        .from('matches')
        .update({ winner_id: winnerId, status: 'completed' })
        .eq('id', matchId);
      if (matchError) throw matchError;

      // 2. Increment points for the winner
      const { data: pointsData, error: pointsError } = await supabase.rpc('increment_points', {
        tournament_id_param: id,
        participant_id_param: winnerId,
      });
      if (pointsError) throw pointsError;

      // 3. Check if all matches are completed and update tournament status
      if (await allMatchesCompleted()) {
        await supabase
          .from('tournaments')
          .update({ status: 'completed' })
          .eq('id', id);
      }

      // 4. Fetch updated data
      fetchTournamentData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const allMatchesCompleted = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .eq('status', 'scheduled');
    if (error) {
      console.error("Error checking matches:", error);
      return false;
    }
    return data.length === 0;
  };

  const handleDeleteTournament = async () => {
    if (!user || !tournament || tournament.created_by !== user.id) {
      setError('Non sei autorizzato a cancellare questo torneo.');
      return;
    }
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      navigation.navigate('Home');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEditTournament = () => {
    navigation.navigate('EditTournament', { id: id });
  };

  if (loading) {
    return <View style={styles.container}><Text>Caricamento...</Text></View>;
  }

  if (!tournament) {
    return <View style={styles.container}><Text>Tournament not found</Text></View>;
  }

  const isOwner = tournament.created_by === user?.id;

  const getWinner = () => {
    if (tournament.status !== 'completed' || participants.length === 0) return null;
    return participants.reduce((prev, current) => (prev.points > current.points) ? prev : current);
  };

  const winner = getWinner();
  const paddingTop = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

  return (
    <ScrollView style={[styles.container, { paddingTop }]} contentContainerStyle={styles.scrollContent}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tournament.name}</Text>
        <Text style={styles.headerDescription}>{tournament.description}</Text>
        {tournament.start_date && (
          <Text style={styles.headerDate}>Start Date: {new Date(tournament.start_date).toLocaleDateString()}</Text>
        )}
        <Text style={[styles.headerStatus, {
          backgroundColor: tournament.status === 'completed' ? 'green' : tournament.status === 'in_progress' ? 'rgba(245, 132, 66, 1.0)' : 'gray',
        }]}>
          {tournament.status.replace('_', ' ')}
        </Text>
        {isOwner && (
          <TouchableOpacity
            onPress={handleEditTournament}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Modifica Torneo</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matches</Text>
          {(tournament.status === 'in_progress' || tournament.status === 'completed') && (
            <MatchList
              matches={matches}
              onSetWinner={tournament.status === 'in_progress' ? handleSetWinner : undefined}
            />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classifica</Text>
          <View style={styles.participantList}>
            <ParticipantList
              participants={participants
                .sort((a, b) => b.points - a.points)
                .map(p => `${p.username} (${p.points} points)`)
              }
              readonly
            />
          </View>
        </View>
        {tournament.status === 'completed' && winner && (
          <View style={styles.winnerContainer}>
            <Text style={styles.winnerTitle}>VINCITORE</Text>
            <Image source={{ uri: 'https://github.com/simone10522/LBDBPP/blob/main/icons/crown.png?raw=true' }} style={styles.winnerCrown} />
            <Text style={styles.winnerName}>{winner.username}</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('ManageParticipants', { id: id })} style={styles.manageButton}>
          <Text style={styles.manageButtonText}>Lista Giocatori</Text>
        </TouchableOpacity>
        {isOwner && tournament.status === 'draft' && (
          <TouchableOpacity onPress={handleStartTournament} style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Tournament</Text>
          </TouchableOpacity>
        )}
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
  scrollContent: {
    paddingBottom: 100,
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
    marginBottom: 10,
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
  winnerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  winnerCrown: {
    height: 80,
    width: 100,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  participantList: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default TournamentDetailsScreen;
