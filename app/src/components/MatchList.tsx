import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Modal from 'react-native-modal';
import * as Notifications from 'expo-notifications';
import { lightPalette, darkPalette } from '../context/themes'; // Import lightPalette and darkPalette

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
  player1_loss: number;
  player2_loss: number;
}

interface MatchListProps {
  matches: Match[];
  onSetWinner?: (matchId: string, winnerId: string, player1Score: number, player2Score: number) => void;
  tournamentStatus: 'draft' | 'in_progress' | 'completed';
  onMatchUpdate?: () => void;
  bestOf: number | null;
  isCreator: boolean; // Prop rinominata in isCreator
  allTournamentMatches: Match[]; // NEW PROP: All matches of the tournament
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function MatchList({ matches, onSetWinner, tournamentStatus, onMatchUpdate, bestOf, isCreator, allTournamentMatches }: MatchListProps) { // Prop rinominata qui e nuova prop
  const { user, isDarkMode } = useAuth(); // Use useAuth hook to get isDarkMode
  const [profileImages, setProfileImages] = useState<{ [key: string]: string }>({});
  const [matchScores, setMatchScores] = useState<{ [matchId: string]: string }>({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [player1Score, setPlayer1Score] = useState<string>('0');
  const [player2Score, setPlayer2Score] = useState<string>('0');
  const [maxScore, setMaxScore] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const backendServerURL = 'https://lbdb-server.onrender.com'; // *** IMPORTANTE: INSERISCI QUI L'IP DEL TUO COMPUTER ***
  const [isNotifyButtonDisabled, setIsNotifyButtonDisabled] = useState(false); // Stato per disabilitare il pulsante

  const theme = isDarkMode ? darkPalette : lightPalette; // Determine current theme

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setNotificationStatus(token));

    // Listener per le notifiche in foreground e background
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationUserId = response.notification.request.content.data?.userId;
      if (notificationUserId === user?.id) {
        // Mostra la notifica SOLO se l'ID utente corrisponde
        Alert.alert("Notifica Match!", response.notification.request.content.body);
      } else {
        console.log("Notifica ignorata: ID utente non corrispondente.");
      }
    });
    return () => subscription.remove(); // Pulisci il listener quando il componente viene smontato

  }, [user]);

  useEffect(() => {
    const fetchProfileImages = async () => {
      const playerIds = matches.reduce((acc, match) => {
        if (match.player1_id) acc.add(match.player1_id);
        if (match.player2_id) acc.add(match.player2_id);
        return acc;
      }, new Set<string>());

      if (playerIds.size > 0) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, profile_image')
            .in('id', Array.from(playerIds));

          if (error) {
            console.error("Error fetching profile images:", error);
          } else {
            const imagesMap: { [key: string]: string } = {};
            data.forEach((profile) => {
              imagesMap[profile.id] = profile.profile_image || '/icons/profile1.png';
            });
            setProfileImages(imagesMap);
          }
        } catch (error) {
          console.error("Error fetching profile images:", error);
        }
      }
    };

    fetchProfileImages();
  }, [matches]);

  useEffect(() => {
    const initialScores = matches.reduce((acc, match) => {
      acc[match.id] = `${match.player1_win} - ${match.player2_win}`;
      return acc;
    }, {} as { [matchId: string]: string });
    setMatchScores(initialScores);
  }, [matches]);

  useEffect(() => {
    if (bestOf === 3) {
      setMaxScore(2);
    } else if (bestOf === 5) {
      setMaxScore(3);
    } else {
      setMaxScore(100);
    }
  }, [bestOf]);

  useEffect(() => {
    if (selectedMatchId) {
      const match = matches.find(m => m.id === selectedMatchId);
      setSelectedMatch(match || null);
    } else {
      setSelectedMatch(null);
    }
  }, [selectedMatchId, matches]);

  useEffect(() => {
    // Determine the current round based on ALL scheduled matches in the tournament
    const scheduledMatches = allTournamentMatches.filter(match => match.status === 'scheduled'); // Use allTournamentMatches here
    if (scheduledMatches.length > 0) {
      const minRound = Math.min(...scheduledMatches.map(match => match.round));
      setCurrentRound(minRound);
    } else {
      // If no scheduled matches, all rounds are considered completed, or no rounds started
      setCurrentRound(allTournamentMatches.length > 0 ? Math.max(...allTournamentMatches.map(match => match.round)) + 1 : 1); // Use allTournamentMatches here
    }
  }, [allTournamentMatches]); // Depend on allTournamentMatches


  const roundsMap = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.entries(roundsMap).sort(( [a], [b] ) => Number(a) - Number(b));

  const toggleModal = (matchId: string | null = null) => {
    setSelectedMatchId(matchId);
    setModalVisible(!isModalVisible);
    if (!matchId) {
      setPlayer1Score('0');
      setPlayer2Score('0');
    }
  };

  const validateScore = (score: string): string => {
    const parsedScore = parseInt(score, 10) || 0;
    if (bestOf === 5 && parsedScore > 3) { // For best of 5, max score is 3 per player per match
      return '3';
    }
    if (bestOf === 3 && parsedScore > 2) { // For best of 3, max score is 2 per player per match
      return '2';
    }
     if (bestOf !== 3 && bestOf !== 5 && parsedScore > maxScore) { // For best of X, max score is maxScore
      return String(maxScore);
    }
    return score;
  };


  const handleSetMatchWinner = async () => {
    if (selectedMatchId && onSetWinner) {
      const parsedPlayer1Score = parseInt(player1Score, 10) || 0;
      const parsedPlayer2Score = parseInt(player2Score, 10) || 0;

      let scoreLimit = maxScore;
      if (bestOf === 3) {
        scoreLimit = 2;
      } else if (bestOf === 5) {
        scoreLimit = 3;
      }

      if (parsedPlayer1Score > scoreLimit || parsedPlayer2Score > scoreLimit) {
        Alert.alert(
          "Invalid Score",
          `Scores cannot exceed ${scoreLimit} for best of ${bestOf} format.`,
          [{ text: "OK" }]
        );
        return;
      }

      if (bestOf === 5 && Math.max(parsedPlayer1Score, parsedPlayer2Score) < 3) {
         Alert.alert(
          "Invalid Score",
          `In best of 5, at least one player must reach 3 wins.`,
          [{ text: "OK" }]
        );
        return;
      }

      if (bestOf === 3 && Math.max(parsedPlayer1Score, parsedPlayer2Score) < 2) {
         Alert.alert(
          "Invalid Score",
          `In best of 3, at least one player must reach 2 wins.`,
          [{ text: "OK" }]
        );
        return;
      }


      if (parsedPlayer1Score + parsedPlayer2Score > (bestOf === 5 ? 5 : bestOf === 3 ? 3 : maxScore * 2 )) {
        Alert.alert(
          "Invalid Score",
          `The sum of scores cannot exceed the best of value (${bestOf === 5 ? 5 : bestOf === 3 ? 3 : maxScore * 2 }). Please adjust the scores.`,
          [{ text: "OK" }]
        );
        return;
      }

      let winnerId = null;

      if (parsedPlayer1Score > parsedPlayer2Score) {
        const match = matches.find(m => m.id === selectedMatchId);
        winnerId = match?.player1_id || null;
      } else if (parsedPlayer2Score > parsedPlayer1Score) {
        const match = matches.find(m => m.id === selectedMatchId);
        winnerId = match?.player2_id || null;
      }

      try {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .update({
            winner_id: winnerId,
            player1_win: parsedPlayer1Score,
            player2_win: parsedPlayer2Score,
            player1_loss: parsedPlayer2Score,
            player2_loss: parsedPlayer1Score,
            status: 'completed'
          })
          .eq('id', selectedMatchId)
          .select('player1_id, player2_id, tournament_id')
          .single();

        if (matchError) {
          console.error("Error updating match:", matchError);
          return;
        }

        // Call the SQL function to update matches_won in tournament_participants
        const { error: rpcError } = await supabase.rpc('update_tournament_participants_matches_won');

        if (rpcError) {
          console.error("Error calling rpc function:", rpcError);
        }

        onSetWinner(selectedMatchId, winnerId, parsedPlayer1Score, parsedPlayer2Score);
        setMatchScores(prevScores => ({
          ...prevScores,
          [selectedMatchId]: `${parsedPlayer1Score} - ${parsedPlayer2Score}`
        }));
        toggleModal();
        if (onMatchUpdate) {
          onMatchUpdate();
        }
      } catch (error) {
        console.error("Error updating match:", error);
        // Handle error (e.g., show an alert)
      }
    }
  };

  const handleNotifyOpponent = async (match: Match) => {
    setIsNotifyButtonDisabled(true);

    try {
      const opponentId = user?.id === match.player1_id ? match.player2_id : match.player1_id;
      const opponentName = user?.id === match.player1_id ? match.player2 : match.player1;

      // Fetch sender's profile to get match_password
      const { data: senderProfile, error: senderProfileError } = await supabase
        .from('profiles')
        .select('match_password') // Select match_password of the sender
        .eq('id', user?.id)
        .single();

      if (senderProfileError) {
        console.error("Errore nel recupero del profilo del mittente:", senderProfileError);
        Alert.alert("Errore", "Impossibile recuperare il profilo del mittente.");
        return;
      }

      const senderMatchPassword = senderProfile?.match_password; // Get sender's match_password

      const { data: opponentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token') // Select push_token of the opponent
        .eq('id', opponentId)
        .single();

      if (profileError) {
        console.error("Errore nel recupero del profilo dell'avversario:", profileError);
        Alert.alert("Errore", "Impossibile recuperare il profilo dell'avversario.");
        return;
      }

      const opponentPushToken = opponentProfile?.push_token;


      if (!opponentPushToken) {
        Alert.alert("Attenzione", `${opponentName} non ha abilitato le notifiche push.`);
        return;
      }

      // Include sender's match_password in the message
      const message = `È il tuo turno di giocare contro ${match.player1} nel torneo! La password per il match è "${senderMatchPassword || 'Password non impostata'}".`;

      const response = await fetch(`${backendServerURL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushToken: opponentPushToken,
          message: message,
          userId: opponentId,
        }),
      });

      if (response.ok) {
        Alert.alert("Notifica inviata!", `Notifica push inviata a ${opponentName}.`);
      } else {
        const errorText = await response.text();
        Alert.alert("Errore nell'invio della notifica", `Status: ${response.status} - ${errorText}`);
      }

    } catch (error) {
      console.error("Errore durante la notifica dell'avversario:", error);
      Alert.alert("Errore", "Qualcosa è andato storto durante l'invio della notifica.");
    } finally {
      setTimeout(() => {
        setIsNotifyButtonDisabled(false);
      }, 30000);
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Your expo push token:", token);
    return token;
  }

  const handleTestBackendConnection = async () => {
    try {
      const response = await fetch(`${backendServerURL}/test`); // CHIAMATA AL BACKEND
      if (response.ok) {
        const text = await response.text();
        Alert.alert("Connessione OK dall'App!", text); // MOSTRA IL RISULTATO IN UN ALERT
      } else {
        Alert.alert("Errore di connessione dall'App", `Status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert("Errore FETCH dall'App", `Errore: ${error.message}`);
    }
  };


  if (tournamentStatus === 'draft') {
    return <Text style={[styles.noMatches, { color: theme.secondaryText }]}>Tournament not started yet.</Text>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => toggleModal()}
        style={styles.modal}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Set Match Results</Text>
          {selectedMatch && (
            <>
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.modalText, { color: theme.text }]}>{selectedMatch.player1} Score:</Text>
                <TextInput
                  style={[styles.scoreInput, {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.borderColor
                  }]}
                  keyboardType="number-pad"
                  value={player1Score}
                  onChangeText={(text) => setPlayer1Score(validateScore(text))}
                />
              </View>
              <View style={styles.scoreInputContainer}>
                <Text style={[styles.modalText, { color: theme.text }]}>{selectedMatch.player2} Score:</Text>
                <TextInput
                  style={[styles.scoreInput, {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.borderColor
                  }]}
                  keyboardType="number-pad"
                  value={player2Score}
                  onChangeText={(text) => setPlayer2Score(validateScore(text))}
                />
              </View>
            </>
          )}
          <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.buttonBackground }]} onPress={handleSetMatchWinner}>
            <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Confirm Results</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.buttonBackground }]} onPress={() => toggleModal()}>
            <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {rounds.map(([round, matches]) => (
        <View key={round}>
          <Text style={[styles.roundTitle, { color: theme.text }]}>Round {round}</Text>
          <View style={styles.matchesContainer}>
            {matches.map((match) => (
              <View
                key={match.id}
                style={[styles.matchItem, { backgroundColor: theme.cardBackground }]}
              >
                {onSetWinner && tournamentStatus === 'in_progress' && match.status === 'scheduled' ? (
                  <View style={[styles.winnerButtons, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }]}>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                      <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{match.player1}</Text>
                    </View>
                    <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                        style={[
                          styles.setResultsButton,
                          { backgroundColor: theme.buttonBackground, padding: 10, marginTop: 5 },
                          match.round !== currentRound || (!isCreator && user && user.id !== match.player1_id && user.id !== match.player2_id) ? styles.disabledButton : {}, // Stili condizionali con isCreator
                          !user ? styles.disabledButton : {} // Disable if user is not logged in
                        ]}
                        onPress={() => toggleModal(match.id)}
                        disabled={
                          match.round !== currentRound || // Round check
                          (!isCreator && user && user.id !== match.player1_id && user.id !== match.player2_id) || // Permission check, ora con isCreator
                          !user // Disable if user is not logged in
                        }
                      >
                        <Text style={[styles.setResultsText, { color: theme.buttonText }]}>Set Results</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.setResultsButton,
                          { backgroundColor: theme.buttonBackground, padding: 10, marginTop: 5 },
                          isNotifyButtonDisabled ? styles.disabledButton : {}, // Stile condizionale per disabilitazione
                          !user ? styles.disabledButton : {} // Disable if user is not logged in
                        ]}
                        onPress={() => handleNotifyOpponent(match)}
                        disabled={!(user && (user.id === match.player1_id || user.id === match.player2_id) && match.round === currentRound) || isNotifyButtonDisabled || !user} // Condizione pulsante notifica + disabilitazione timer + disable if user is not logged in
                      >
                        <Image
                          source={require('../../assets/bell-icon.png')}
                          style={{ width: 20, height: 20 }}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                        style={styles.profileImage}
                      />
                      <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{match.player2}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.completedMatch, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player1_id] || '/icons/profile1.png' }}
                        style={[styles.profileImage, match.winner_id !== match.player1_id ? styles.dimmedImage : {}]}
                      />
                      <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{match.player1}</Text>
                    </View>
                    <Text style={[styles.scoreText, { width: 50, color: theme.text }]}>{matchScores[match.id] || '0 - 0'}</Text>
                    <View style={styles.playerContainer}>
                      <Image
                        source={{ uri: profileImages[match.player2_id] || '/icons/profile1.png' }}
                        style={[styles.profileImage, match.winner_id !== match.player2_id ? styles.dimmedImage : {}]}
                      />
                      <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{match.player2}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  matchesContainer: {
    marginBottom: 10,
  },
  matchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vs: {
    marginHorizontal: 5,
    color: '#666',
  },
  winner: {
    fontWeight: 'bold',
  },
  winnerButtons: {
    alignItems: 'center',
    flexDirection: 'row', // Changed to row
    justifyContent: 'space-around', // Changed to space-around
  },
  winnerButton: {
    padding: 5,
    borderRadius: 5,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 20,
  },
  completedMatch: {
    alignItems: 'center',
  },
  dimmedImage: {
    opacity: 0.5,
  },
  playerName: {
    fontSize: 24,
    textAlign: 'center',
  },
  playerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  noMatches: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  setResultsButton: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  setResultsText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    width: '90%', // Increased width
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButtonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: 'gray',
    opacity: 0.6,
  },
  testButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignSelf: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
