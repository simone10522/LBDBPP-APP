import React, { useEffect, useState, useCallback, useRef } from 'react';
    import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, RefreshControl } from 'react-native';
    import { useNavigation, useRoute } from '@react-navigation/native';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/_useAuth';
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
      best_of: number | null;
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
      player1_win: number;
      player2_win: number;
    }

    export default function TournamentDetailsScreen() {
      const { id, refresh } = useRoute().params as { id: string, refresh?: boolean };
      const { user } = useAuth();
      const navigation = useNavigation();
      const [tournament, setTournament] = useState<Tournament | null>(null);
      const [participants, setParticipants] = useState<Participant[]>([]);
      const [matches, setMatches] = useState<Match[]>([]);
      const [error, setError] = useState<string | null>(null);
      const [loading, setLoading] = useState(true);
      const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
      const [isParticipating, setIsParticipating] = useState(false);
      const [participantId, setParticipantId] = useState<string | null>(null);
      const [tournamentStatus, setTournamentStatus] = useState<'draft' | 'in_progress' | 'completed'>('draft');
      const [refreshing, setRefreshing] = useState(false);
      const [showUserMatches, setShowUserMatches] = useState<boolean>(false); // Added state for filtering matches

      const fetchParticipants = useCallback(async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('tournament_participants')
            .select(`
              id,
              deck,
              profiles:participant_id (username)
            `)
            .eq('tournament_id', id);

          if (error) {
            throw new Error(`Errore durante il recupero dei partecipanti: ${error.message}`);
          }

          if (data) {
            setParticipants(
              data.map((p) => ({
                id: p.id,
                username: p.profiles.username,
                deck: p.deck,
                points: 0
              }))
            );
          } else {
            setParticipants([]);
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
        if (id) {
          fetchTournamentData();
        }
      }, [id]);

      useEffect(() => {
        if (refresh) {
          fetchTournamentData();
        }
      }, [refresh, id]);

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
              player1_win,
              player2_win,
              player1:player1_id(username),
              player2:player2_id(username)
            `)
            .eq('tournament_id', id)
            .order('round', { ascending: true });
          if (matchesError) throw matchesError;
          setMatches(matchesData.map(m => ({
            ...m,
            player1: m.player1.username,
            player2: m.player2.username,
            player1_win: m.player1_win || 0,
            player2_win: m.player2_win || 0
          })) || []);
        } catch (error: any) {
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

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

        if (maxPlayers !== null && participants.length >= maxPlayers) {
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
            .eq('id', id);
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

      const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTournamentData().then(() => setRefreshing(false));
      }, [fetchTournamentData]);

      const filteredMatches = showUserMatches
    ? matches.filter(match => match.player1_id === user?.id || match.player2_id === user?.id)
    : matches;

      if (loading) {
        return <View style={styles.container}><Text>Caricamento...</Text></View>;
      }

      if (!tournament) {
        return <View style={styles.container}><Text>Tournament not found</Text></View>;
      }

      const isOwner = tournament.created_by === user?.id;
      const isCreator = isOwner; // Define isCreator based on isOwner

      const getWinner = () => {
        if (tournament.status !== 'completed' || participants.length === 0) return null;
        return participants.reduce((prev, current) => (prev.points > current.points) ? prev : current);
      };

      const winner = getWinner();
      const paddingTop = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

      return (
        <ScrollView
          style={[styles.container, { paddingTop }]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{tournament.name}</Text>
            <Text style={styles.headerDescription}>{tournament.description}</Text>
            <Text style={styles.headerDate}>
              Start Date: {new Date(tournament.start_date!).toLocaleDateString()}
              {tournament.best_of && ` (Best of ${tournament.best_of})`}
            </Text>
            <Text style={[styles.headerStatus, {
              backgroundColor: tournament.status === 'completed' ? 'green' : tournament.status === 'in_progress' ? 'rgba(245, 132, 66, 1.0)' : 'gray',
            }]}>
              {tournament.status.replace('_', ' ')}
            </Text>
             {isOwner && tournament.status === 'draft' && (
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
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Matches</Text>
                <TouchableOpacity onPress={() => setShowUserMatches(!showUserMatches)} style={{ position: 'absolute', right: 10, top: 0 }}>
                  <Text style={[styles.sectionTitleRight, {  fontSize: 24, fontWeight: showUserMatches ? 'bold' : 'normal' }]}>Your Matches</Text>
                </TouchableOpacity>
              </View>
              {(tournament.status === 'in_progress' || tournament.status === 'completed') && (
                <MatchList
                  matches={filteredMatches}
                  onSetWinner={tournament.status === 'in_progress' ? handleSetWinner : undefined}
                  tournamentStatus={tournament.status}
                  bestOf={tournament.best_of}
                  isCreator={isCreator} // Pass isCreator prop here
                  onMatchUpdate={fetchTournamentData}
                  allTournamentMatches={matches} // Pass all matches here
                />
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => navigation.navigate('ManageParticipants', { id: id })} style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Lista Giocatori</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard', { id: id })} style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Leaderboard</Text>
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
        position: 'relative',
      },
      sectionTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      },
      sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
      },
      sectionTitleCenter: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'right',
        flex: 1,
      },
      sectionTitleRight: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'right',
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
