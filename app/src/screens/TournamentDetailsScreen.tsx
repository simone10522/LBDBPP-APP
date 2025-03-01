import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import MatchList from '../components/MatchList';
import ParticipantList from '../components/ParticipantList';
import { Trash2, Edit } from 'lucide-react';
import Constants from 'expo-constants';
import { lightPalette, darkPalette } from '../context/themes';
import Accordion from '../components/Accordion';

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
    max_rounds: number | null;
    format: string | null; // ADDED format to Tournament interface
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
    const { user, isDarkMode } = useAuth();
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
    const [currentRoundIncomplete, setCurrentRoundIncomplete] = useState(false);

    const theme = isDarkMode ? darkPalette : lightPalette;

    const checkCurrentRoundCompletion = useCallback(() => {
        if (matches.length === 0) {
            setCurrentRoundIncomplete(false);
            return;
        }

        const scheduledMatches = matches.filter(match => match.status === 'scheduled');
        if (scheduledMatches.length === 0) {
            setCurrentRoundIncomplete(false);
            return;
        }
        const currentRound = scheduledMatches.reduce((maxRound, match) => Math.max(maxRound, match.round), 0);

        const incompleteMatches = matches.filter(match => match.round === currentRound && match.status !== 'completed');
        setCurrentRoundIncomplete(incompleteMatches.length > 0);
    }, [matches]);

    useEffect(() => {
        checkCurrentRoundCompletion();
    }, [checkCurrentRoundCompletion]);

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
        }    };

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
            if (tournament?.max_players !== null && participants.length < tournament.max_players) {
                setError(`Mancano ${tournament.max_players - participants.length} giocatori per avviare il torneo`);
                return;
            }

            const functionName = tournament?.format === 'round-robin' ? 'generate_Robin_tournament_matches' : 'generate_tournament_matches';

            // Add log here
            console.log(`Using Supabase function: ${functionName}`);

            const { error } = await supabase
                .from('tournaments')
                .update({ status: 'in_progress' })
                .eq('id', id);
            if (error) throw error;

            const { error: generateMatchesError } = await supabase.rpc(functionName, {
                tournament_id_param: id,
            });
            if (generateMatchesError) throw generateMatchesError;

            fetchTournamentData();
        } catch (error: any) {
            setError(error.message);
        }
    };

    const isLastRoundCompleted = async (tournamentId: string, lastRound: number) => {
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('round', lastRound)
            .eq('status', 'scheduled');

        if (error) {
            console.error("Error checking last round completion:", error);
            return false;
        }
        return data.length === 0;
    };

    const handleSetWinner = async (matchId: string, winnerId: string) => {
        try {
            const { error: matchError, data: updatedMatch } = await supabase
                .from('matches')
                .update({ winner_id: winnerId, status: 'completed' })
                .eq('id', matchId)
                .select()
                .single();
            if (matchError) throw matchError;

            const { data: pointsData, error: pointsError } = await supabase.rpc('increment_points', {
                tournament_id_param: id,
                participant_id_param: winnerId,
            });
            if (pointsError) throw pointsError;

            if (tournament && tournament.max_rounds && updatedMatch && updatedMatch.round === tournament.max_rounds) {
                if (await isLastRoundCompleted(id, tournament.max_rounds)) {
                    const { error: tournamentError } = await supabase
                        .from('tournaments')
                        .update({ status: 'completed' })
                        .eq('id', id);
                    if (tournamentError) throw tournamentError;
                }
            }
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
        // Navigate to CreateTournamentScreen and pass tournament data
        navigation.navigate('CreateTournament', { tournamentData: tournament });
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTournamentData().then(() => setRefreshing(false));
    }, [fetchTournamentData]);

    let userNextRound = null;
    if (user) {
        for (const match of matches) {
            if ((match.player1_id === user.id || match.player2_id === user.id) && match.status === 'scheduled') {
                userNextRound = match.round;
                break;
            }
        }
    }

    const isOwner = tournament?.created_by === user?.id;
    const isCreator = isOwner;

    const getWinner = () => {
        if (tournament?.status !== 'completed' || participants.length === 0) return null;
        return participants.reduce((prev, current) => (prev.points > current.points) ? prev : current);
    };

    const winner = getWinner();
    const paddingTop = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop, backgroundColor: theme.background }]}>
                <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
            </View>
        );
    }

    const matchesByRound = matches.reduce((acc, match) => {
        const round = match.round;
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(match);
        return acc;
    }, {});

    const handleGenerateNextRound = async () => {
        try {
            const lastRoundMatches = matches.filter(match => match.status === 'completed');
            const lastRoundNumber = lastRoundMatches.reduce((maxRound, match) => Math.max(maxRound, match.round), 0);

            const { error: generateMatchesError } = await supabase.rpc('generate_next_round_matches', {
                tournament_id_param: id,
                previous_round_number: lastRoundNumber
            });

            if (generateMatchesError) {
                throw generateMatchesError;
            }

            fetchTournamentData();
        } catch (error: any) {
            setError(error.message);
        }
    };

    // Calculate the current round
    const currentRound = matches.reduce((maxRound, match) => Math.max(maxRound, match.round), 0);

    // Modify canGenerateNextRound to also check if the current round is less than max_rounds
    const canGenerateNextRound = isCreator && tournament?.status === 'in_progress' && currentRound < (tournament?.max_rounds || Infinity);


    return (
        <ScrollView
            style={[styles.container, { paddingTop, backgroundColor: theme.background }]}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
            }
        >
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
                </View>
            )}

            {tournament ? (
                <>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>{tournament.name}</Text>
                        <Text style={[styles.headerDescription, { color: theme.text }]}>{tournament.description}</Text>
                        <Text style={[styles.headerDate, { color: theme.text }]}>
                            Start Date: {new Date(tournament.start_date!).toLocaleDateString()}
                            {tournament.best_of && ` (Best of ${tournament.best_of})`}
                        </Text>
                        <Text style={[styles.headerStatus, {
                            backgroundColor: tournament.status === 'completed' ? '#2ecc71' : tournament.status === 'in_progress' ? '#e67e22' : '#7f8c8d',
                            color: theme.text
                        }]}>
                            {tournament.status.replace('_', ' ')}
                        </Text>
                        {isOwner && tournament.status === 'draft' && (
                            <TouchableOpacity
                                onPress={handleEditTournament} // MODIFIED: handleEditTournament function
                                style={[styles.editButton, { backgroundColor: theme.buttonBackground }]}
                            >
                                <Text style={[styles.editButtonText, { color: theme.buttonText }]}>Modifica Torneo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.content}>
                        <View style={styles.section}>
                            <View style={styles.sectionTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>Matches</Text>
                            </View>

                            {Object.entries(matchesByRound).sort(([roundA], [roundB]) => parseInt(roundA) - parseInt(roundB)).map(([round, roundMatches]) => (
                                <Accordion key={round} title={`Round ${round}`}>
                                    <MatchList
                                        matches={roundMatches}
                                        onSetWinner={tournament.status === 'in_progress' ? handleSetWinner : undefined}
                                        tournamentStatus={tournament.status}
                                        bestOf={tournament.best_of}
                                        isCreator={isCreator}
                                        onMatchUpdate={fetchTournamentData}
                                        allTournamentMatches={matches}
                                        user={user}
                                    />
                                </Accordion>
                            ))}
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => navigation.navigate('ManageParticipants', { id: id })} style={[styles.manageButton, { backgroundColor: theme.buttonBackground }]}>
                            <Text style={[styles.manageButtonText, { color: theme.buttonText }]}>Lista Giocatori</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard', { id: id })} style={[styles.manageButton, { backgroundColor: theme.buttonBackground }]}>
                            <Text style={[styles.manageButtonText, { color: theme.buttonText }]}>Leaderboard</Text>
                        </TouchableOpacity>
                        {isOwner && tournament.status === 'draft' && (
                            <TouchableOpacity onPress={handleStartTournament} style={[styles.startButton, { backgroundColor: theme.buttonBackground }]}>
                                <Text style={[styles.startButtonText, { color: theme.buttonText }]}>Start Tournament</Text>
                            </TouchableOpacity>
                        )}
                        {canGenerateNextRound && (
                            <TouchableOpacity onPress={currentRoundIncomplete ? () => {} : handleGenerateNextRound}
                                style={[styles.startButton, { backgroundColor: theme.buttonBackground }, currentRoundIncomplete ? { opacity: 0.5 } : {}]}
                                disabled={currentRoundIncomplete}>
                                <Text style={[styles.startButtonText, { color: theme.startButtonText }]}>Genera Prossimo Round</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            ) : (
                <Text style={[styles.errorText, { color: theme.error }]}>Tournament not found.</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
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
        textShadowColor: 'black',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 0,
        textAlign: 'center',
    },
    headerDescription: {
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    headerDate: {
        fontSize: 14,
        marginBottom: 10,
    },
    headerStatus: {
        padding: 5,
        borderRadius: 5,
        color: lightPalette.text,
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
    },
    sectionTitleCenter: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right',
        flex: 1,
    },
    sectionTitleRight: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    participantItem: {
        fontSize: 16,
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
        backgroundColor: lightPalette.buttonBackground,
        padding: 10,
        borderRadius: 5,
    },
    manageButtonText: {
        color: lightPalette.buttonText,
        fontWeight: 'bold',
    },
    startButton: {
        backgroundColor: '#2ecc71',
        padding: 10,
        borderRadius: 5,
    },
    startButtonText: {
        color: lightPalette.buttonText,
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
        backgroundColor: lightPalette.buttonBackground,
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    editButtonText: {
        color: lightPalette.buttonText,
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
    loadingText: {
        color: lightPalette.text,
        textAlign: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        padding: 20,
    },
});
