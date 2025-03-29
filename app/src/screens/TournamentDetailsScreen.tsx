import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, RefreshControl, Animated, Easing, TextInput, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import MatchList from '../components/MatchList';
import ParticipantList from '../components/ParticipantList';
import { Lock, Unlock, Crown, Users, Trophy, Edit2, Trash2 } from 'lucide-react-native';
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
    format: string | null;
    private?: boolean;
    creatorUsername?: string;
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

type Energy = 'fuoco' | 'terra' | 'acqua' | 'elettro' | 'normale' | 'erba' | 'oscurità' | 'lotta' | 'acciaio' | 'psico';

export default function TournamentDetailsScreen() {
    const { id, refresh } = useRoute().params as { id: string, refresh?: boolean };
    const { user, isDarkMode } = useAuth();
    const navigation = useNavigation();
    const buttonScale = useRef(new Animated.Value(1)).current;
    const modalAnimation = useRef(new Animated.Value(0)).current;
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
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const theme = isDarkMode ? darkPalette : lightPalette;

    const showModalAnimation = () => {
        Animated.spring(modalAnimation, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7
        }).start();
    };

    const hideModalAnimation = () => {
        Animated.timing(modalAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start();
    };

    const getWinner = useCallback(() => {
        if (tournament?.status !== 'completed' || participants.length === 0) return null;
        return participants.reduce((prev, current) => (prev.points > current.points) ? prev : current);
    }, [tournament?.status, participants]);

    const animateButton = useCallback(() => {
        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.95,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.timing(buttonScale, {
                toValue: 1,
                duration: 100,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
        ]).start();
    }, [buttonScale]);

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
                .select(`
                    *,
                    creator:created_by (username)
                `)
                .eq('id', id)
                .single();
            if (tournamentError) throw tournamentError;
            setTournament({ ...tournamentData, creatorUsername: tournamentData.creator.username });

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

            await checkIfParticipating(); // Call checkIfParticipating after fetching participants
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

    useEffect(() => {
        fetchMaxPlayers();
        checkIfParticipating();
    }, [user, id]);

    const handleJoinTournament = async () => {
        if (!user) {
            setError('Devi essere loggato per partecipare al torneo.');
            return;
        }

        if (maxPlayers !== null && participants.length >= maxPlayers) {
            setError('Il torneo ha raggiunto il numero massimo di partecipanti.');
            return;
        }

        if (tournament?.private) {
            setShowPasswordModal(true);
            showModalAnimation();
            return;
        }

        await joinTournament();
    };

    const joinTournament = async (providedPassword?: string) => {
        try {
            if (tournament?.private) {
                const { data, error: pwdError } = await supabase
                    .from('tournaments')
                    .select('password')
                    .eq('id', id)
                    .single();

                if (pwdError) throw new Error('Errore durante la verifica della password');
                if (data.password !== providedPassword) {
                    setPasswordError('Password errata');
                    return;
                }
            }

            const { error } = await supabase
                .from('tournament_participants')
                .insert([{ tournament_id: id, participant_id: user.id }]);

            if (error) throw new Error(`Errore durante l'iscrizione: ${error.message}`);

            setShowPasswordModal(false);
            setPassword('');
            setPasswordError('');
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

    const handleMessageCreator = () => {
        if (!tournament?.creatorUsername) return;
        
        navigation.navigate('ChatScreen', {
            receiverProfile: {
                id: tournament.created_by,
                username: tournament.creatorUsername,
                profile_image: null // Se necessario, recupera l'immagine del profilo del creatore
            }
        });
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
    const winner = getWinner();
    const paddingTop = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

    const handleManageDecks = () => {
        console.log('Tournament ID:', id);
        console.log('Participant ID:', user?.id);
        navigation.navigate('TournamentDeckScreen', { tournamentId: id });
    };

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
        <View style={[styles.container, { paddingTop, backgroundColor: theme.background }]}>
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.background }}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
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
                        <View style={[styles.tournamentCard, { backgroundColor: theme.cardBackground }]}>
                            <View style={styles.cardHeader}>
                                {tournament.private && <Lock size={24} color={theme.text} />}
                                <Text style={[styles.headerTitle, { color: theme.text }]}>{tournament.name}</Text>
                            </View>
                            
                            <Text style={[styles.headerDescription, { color: theme.text }]}>{tournament.description}</Text>
                            
                            <View style={styles.tournamentInfo}>
                                <View style={styles.infoItem}>
                                    <Users size={20} color={theme.text} />
                                    <Text style={[styles.infoText, { color: theme.text }]}>
                                        {participants.length}/{maxPlayers === null ? '∞' : maxPlayers}
                                    </Text>
                                </View>
                                
                                <View style={styles.infoItem}>
                                    <Trophy size={20} color={theme.text} />
                                    <Text style={[styles.infoText, { color: theme.text }]}>
                                        Best of {tournament.best_of}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.statusContainer]}>
                                <View style={[styles.statusBadge, { 
                                    backgroundColor: tournament.status === 'completed' ? '#2ecc71' : 
                                                    tournament.status === 'in_progress' ? '#e67e22' : '#7f8c8d'
                                }]}>
                                    <Text style={styles.statusText}>
                                        {tournament.status.replace('_', ' ').toUpperCase()}
                                    </Text>
                                </View>
                                {!isOwner && (
                                    <TouchableOpacity
                                        onPress={handleMessageCreator}
                                        style={[styles.messageButton, { backgroundColor: theme.buttonBackground }]}
                                    >
                                        <Text style={[styles.messageButtonText, { color: theme.buttonText }]}>
                                            Message {tournament.creatorUsername || 'Creator'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isOwner && tournament.status === 'draft' && (
                                <View style={styles.ownerActions}>
                                    <TouchableOpacity
                                        onPress={handleEditTournament}
                                        style={[styles.iconButton, { backgroundColor: theme.buttonBackground }]}
                                    >
                                        <Edit2 size={20} color={theme.buttonText} />
                                        <Text style={[styles.iconButtonText, { color: theme.buttonText }]}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleDeleteTournament}
                                        style={[styles.iconButton, { backgroundColor: theme.error }]}
                                    >
                                        <Trash2 size={20} color={theme.buttonText} />
                                        <Text style={[styles.iconButtonText, { color: theme.buttonText }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.content}>
                            {tournament.status !== 'draft' && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Rounds</Text>
                                        {canGenerateNextRound && (
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (!currentRoundIncomplete) {
                                                        animateButton();
                                                        handleGenerateNextRound();
                                                    }
                                                }}
                                                style={[
                                                    styles.generateButton,
                                                    { backgroundColor: theme.buttonBackground },
                                                    currentRoundIncomplete ? { opacity: 0.5 } : {}
                                                ]}
                                                disabled={currentRoundIncomplete}
                                            >
                                                <Text style={[styles.generateButtonText, { color: theme.buttonText }]}>
                                                    Genera Round {currentRound + 1}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {Object.entries(matchesByRound)
                                        .sort(([roundA], [roundB]) => parseInt(roundA) - parseInt(roundB))
                                        .map(([round, roundMatches]) => (
                                            <Accordion 
                                                key={round} 
                                                title={`Round ${round}`}
                                                theme={theme}
                                            >
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
                            )}
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('ManageParticipants', { id: id })} 
                                style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
                            >
                                <Users size={30} color={theme.buttonText} />
                                <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>Players</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => navigation.navigate('Leaderboard', { id: id })} 
                                style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
                            >
                                <Trophy size={30} color={theme.buttonText} />
                                <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>Leaderboard</Text>
                            </TouchableOpacity>

                            {isParticipating && participantId && (
                                <TouchableOpacity 
                                    onPress={handleManageDecks}
                                    style={[styles.actionButton, { backgroundColor: theme.buttonBackground }]}
                                >
                                    <Image 
                                        source={require('../../assets/deck.png')} 
                                        style={styles.deckIcon} 
                                    />
                                    <Text style={[styles.actionButtonText, { color: theme.buttonText }]}>Manage Decks</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {tournament.status === 'draft' && (
                            <View style={styles.bottomActions}>
                                {isOwner && (maxPlayers !== null && participants.length >= maxPlayers) && (
                                    <TouchableOpacity 
                                        onPress={handleStartTournament}
                                        style={[styles.startButton, { backgroundColor: '#2ecc71' }]}
                                    >
                                        <Text style={styles.startButtonText}>Avvia Torneo</Text>
                                    </TouchableOpacity>
                                )}
                                {isParticipating ? (
                                    <TouchableOpacity 
                                        onPress={handleLeaveTournament}
                                        style={[styles.leaveButton, { backgroundColor: '#e74c3c' }]}
                                    >
                                        <Text style={styles.leaveButtonText}>Leave</Text>
                                    </TouchableOpacity>
                                ) : (
                                    (maxPlayers === null || participants.length < maxPlayers) && (
                                        <TouchableOpacity 
                                            onPress={handleJoinTournament}
                                            style={[styles.joinButton, { backgroundColor: '#2ecc71' }]}
                                        >
                                            <Text style={styles.joinButtonText}>Join</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        )}

                        {tournament.status === 'completed' && winner && (
                            <View style={[styles.winnerCard, { backgroundColor: theme.cardBackground }]}>
                                <Crown size={40} color="#FFD700" />
                                <Text style={[styles.winnerTitle, { color: theme.text }]}>Vincitore</Text>
                                <Text style={[styles.winnerName, { color: theme.text }]}>{winner.username}</Text>
                                <Text style={[styles.winnerPoints, { color: theme.secondaryText }]}>
                                    {winner.points} punti
                                </Text>
                            </View>
                        )}
                    </>
                ) : (
                    <Text style={[styles.errorText, { color: theme.error }]}>Torneo non trovato.</Text>
                )}
            </ScrollView>

            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="none"
                onRequestClose={() => {
                    hideModalAnimation();
                    setTimeout(() => setShowPasswordModal(false), 200);
                }}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        style={[
                            styles.modalContent,
                            { 
                                backgroundColor: theme.cardBackground,
                                transform: [{
                                    translateY: modalAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [600, 0]
                                    })
                                }]
                            }
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            Insert Tournament Password
                        </Text>
                        <TextInput
                            style={[styles.passwordInput, { 
                                backgroundColor: theme.background,
                                color: theme.text,
                                borderColor: passwordError ? theme.error : theme.border
                            }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor={theme.secondaryText}
                            secureTextEntry
                        />
                        {passwordError && (
                            <Text style={[styles.errorText, { color: theme.error }]}>
                                {passwordError}
                            </Text>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, { backgroundColor: '#e74c3c' }]}
                                onPress={() => {
                                    hideModalAnimation();
                                    setTimeout(() => {
                                        setShowPasswordModal(false);
                                        setPassword('');
                                        setPasswordError('');
                                    }, 200);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, { backgroundColor: '#2ecc71' }]}
                                onPress={() => joinTournament(password)}
                            >
                                <Text style={styles.modalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    tournamentCard: {
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    headerDescription: {
        fontSize: 16,
        marginBottom: 15,
    },
    tournamentInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        marginLeft: 5,
        fontSize: 16,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold',
    },
    messageButton: {
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginLeft: 10,
    },
    messageButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    ownerActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
    },
    iconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    iconButtonText: {
        marginLeft: 5,
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 10,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    generateButton: {
        padding: 8,
        borderRadius: 8,
    },
    generateButtonText: {
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 20,
    },
    actionButton: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        minWidth: 100,
    },
    actionButtonText: {
        marginTop: 5,
        fontWeight: 'bold',
    },
    deckIcon: {
        width: 30,
        height: 30,
        tintColor: 'white',
    },
    bottomActions: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    startButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    startButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    leaveButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    leaveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    joinButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    joinButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    winnerCard: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 15,
        marginTop: 20,
    },
    winnerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    winnerName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 5,
    },
    winnerPoints: {
        fontSize: 16,
        marginTop: 5,
    },
    errorContainer: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    error: {
        fontSize: 16,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    loadingText: {
        color: lightPalette.text,
        textAlign: 'center',
        padding: 20,
    },
    buttonText: {
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
        transform: [{ translateY: 0 }]
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    passwordInput: {
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        minWidth: 100,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
