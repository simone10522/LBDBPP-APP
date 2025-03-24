import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert, Clipboard, FlatList, Animated, Easing } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Modal from 'react-native-modal';
import * as Notifications from 'expo-notifications';
import { lightPalette, darkPalette } from '../context/themes'; // Import lightPalette and darkPalette
import { ClipboardIcon } from "lucide-react-native"; // IMPORT ClipboardIcon from lucide-react-native
import messaging from '@react-native-firebase/messaging'; // ADDED Firebase Messaging
import { useNavigation } from '@react-navigation/native';

interface Match {
  id: string;
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
  match_password?: string | null; // ADDED match_password
}

interface MatchListProps {
  matches: Match[];
  onSetWinner?: (matchId: string, winnerId: string, player1Score: number, player2Score: number) => void;
  tournamentStatus: 'draft' | 'in_progress' | 'completed';
  onMatchUpdate?: () => void;
  bestOf: number | null;
  isCreator: boolean;
  allTournamentMatches: Match[];
  user: any | null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function MatchList({ matches, onSetWinner, tournamentStatus, onMatchUpdate, bestOf, isCreator, allTournamentMatches, user }: MatchListProps) {
  const { isDarkMode } = useAuth();
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
  const backendServerURL = 'https://lbdb-server.onrender.com';
  const [isNotifyButtonDisabled, setIsNotifyButtonDisabled] = useState(false);
  const [matchPasswords, setMatchPasswords] = useState<{ [matchId: string]: string | null }>({}); // ADDED matchPasswords state
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null); // ADDED firebaseToken state
  const [userProfiles, setUserProfiles] = useState<{ [userId: string]: { status: string } }>({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [profilePressScale] = useState(new Animated.Value(1));
  const navigation = useNavigation();

  const theme = isDarkMode ? darkPalette : lightPalette;

  // Function to order matches: user's match first
  const orderMatches = (currentRoundMatches: Match[]) => {
    if (!user) return currentRoundMatches;
    let userMatch = null;
    let otherMatches = [];
    for (const match of currentRoundMatches) {
      if (match.player1_id === user.id || match.player2_id === user.id) {
        userMatch = match;
      } else {
        otherMatches.push(match);
      }
    }
    return userMatch ? [userMatch, ...otherMatches] : otherMatches;
  };

  const orderedMatches = orderMatches(matches); // Use matches prop directly

  useEffect(() => {
    //registerForPushNotificationsAsync().then(token => setNotificationStatus(token));

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
    const scheduledMatches = allTournamentMatches.filter(match => match.status === 'scheduled');
    if (scheduledMatches.length > 0) {
      const minRound = Math.min(...scheduledMatches.map(match => match.round));
      setCurrentRound(minRound);
    } else {
      // If no scheduled matches, all rounds are considered completed, or no rounds started
      setCurrentRound(allTournamentMatches.length > 0 ? Math.max(...allTournamentMatches.map(match => match.round)) + 1 : 1);
    }
  }, [allTournamentMatches]);

  useEffect(() => {
    const fetchMatchPasswords = async () => {
      const matchIds = matches.map(match => match.id);
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('id, match_password')
          .in('id', matchIds);

        if (error) {
          console.error("Error fetching match passwords:", error);
        } else {
          const passwordsMap: { [matchId]: string | null } = {};
          data.forEach(match => {
            passwordsMap[match.id] = match.match_password;
          });
          setMatchPasswords(passwordsMap);
        }
      } catch (error) {
        console.error("Error fetching match passwords:", error);
      }
    };

    fetchMatchPasswords();
  }, [matches]);

  useEffect(() => {
    const getFirebaseToken = async () => {
      try {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          setFirebaseToken(fcmToken);
          console.log("Firebase Token in MatchList:", fcmToken);
        } else {
          console.log("Firebase token not available.");
        }
      } catch (error) {
        console.error("Error getting Firebase token:", error);
      }
    };

    getFirebaseToken();
  }, []);

  useEffect(() => {
    const fetchUserProfiles = async () => {
      const playerIds = matches.reduce((acc, match) => {
        if (match.player1_id) acc.add(match.player1_id);
        if (match.player2_id) acc.add(match.player2_id);
        return acc;
      }, new Set<string>());

      if (playerIds.size > 0) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, status')
            .in('id', Array.from(playerIds));

          if (error) {
            console.error("Error fetching user profiles:", error);
          } else {
            const profilesMap: { [userId: string]: { status: string } } = {};
            data.forEach((profile) => {
              profilesMap[profile.id] = { status: profile.status };
            });
            setUserProfiles(profilesMap);
          }
        } catch (error) {
          console.error("Error fetching user profiles:", error);
        }
      }
    };

    fetchUserProfiles();
  }, [matches]);

  const toggleModal = (matchId: string | null = null) => {
    setSelectedMatchId(matchId);
    setModalVisible(!isModalVisible);
    if (!matchId) {
      setPlayer1Score('0');
      setPlayer2Score('0');
    }
  };

  const validateScore = (score: string): string => {
    let parsedScore = parseInt(score, 10) || 0;

    if (bestOf === 1) {
      parsedScore = Math.min(parsedScore, 1);
    } else if (bestOf === 3) {
      parsedScore = Math.min(parsedScore, 2);
    } else if (bestOf === 5) {
      parsedScore = Math.min(parsedScore, 3);
    } else if (bestOf !== null) {
      parsedScore = Math.min(parsedScore, maxScore);
    }

    return String(parsedScore);
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

      if (bestOf === 1 && (parsedPlayer1Score > 1 || parsedPlayer2Score > 1)) {
        Alert.alert(
          "Invalid Score",
          "For best of 1, scores cannot exceed 1.",
          [{ text: "OK" }]
        );
        return;
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


      if (parsedPlayer1Score + parsedPlayer2Score > (bestOf === 5 ? 5 : bestOf === 3 ? 3 : bestOf === 1 ? 1 : maxScore * 2 )) {
        Alert.alert(
          "Invalid Score",
          `The sum of scores cannot exceed the best of value (${bestOf === 5 ? 5 : bestOf === 3 ? 3 : bestOf === 1 ? 1 : maxScore * 2 }). Please adjust the scores.`,
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

      const { data: opponentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
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

      const message = `È il tuo turno di giocare contro ${opponentName} nel torneo!`;

      // Use Firebase token instead of Expo token
      const response = await fetch(`${backendServerURL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushToken: opponentPushToken, // Use opponent's push token
          message: message,
          userId: opponentId,
          notificationType: 'match', // ADDED notificationType for match
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

  /*async function registerForPushNotificationsAsync() {
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
  }*/

  const handleTestBackendConnection = async () => {
    try {
      const response = await fetch(`${backendServerURL}/test`);
      if (response.ok) {
        const text = await response.text();
        Alert.alert("Connessione OK dall'App!", text);
      } else {
        Alert.alert("Errore di connessione dall'App", `Status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert("Errore FETCH dall'App", `Errore: ${error.message}`);
    }
  };

  const handleProfilePress = (playerId, playerUsername) => {
    // Se l'utente clicca la propria immagine, vai al profilo
    if (user && playerId === user.id) {
      navigation.navigate('Profile');
      return;
    }

    // Animazione di shrink per gli altri profili
    Animated.sequence([
      Animated.timing(profilePressScale, {
        toValue: 0.9,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true
      }),
      Animated.timing(profilePressScale, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true
      })
    ]).start();

    setSelectedPlayer({ id: playerId, username: playerUsername });
    setIsPlayerModalVisible(true);
  };

  const handleSendMessage = () => {
    setIsPlayerModalVisible(false);
    navigation.navigate('ChatScreen', {
      receiverProfile: {
        id: selectedPlayer.id,
        username: selectedPlayer.username,
        profile_image: profileImages[selectedPlayer.id]
      }
    });
  };

  const handleShowDeck = () => {
    setIsPlayerModalVisible(false);
    // Per ora non fa nulla, implementare in futuro
    Alert.alert('Coming Soon', 'This feature will be available soon!');
  };

  if (tournamentStatus === 'draft') {
    return <Text style={[styles.noMatches, { color: theme.secondaryText }]}>Tournament not started yet.</Text>;
  }

  const renderSetItem = ({ item }) => {
    return (
      <View style={[styles.setContainer]}>
        <Text style={[styles.setLabel, { color: theme.text }]}>{item.setName}</Text>
        <FlatList
          data={item.cards}
          renderItem={renderCardItem}
          keyExtractor={(card) => card.id}
          numColumns={3}
          contentContainerStyle={styles.cardListContainer}
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({length: 120, offset: 120 * index, index})}
        />
      </View>
    )
  };

  const renderMatchItem = ({ item, index }) => {
    const isMyMatch = orderedMatches[0] === item;
    const showOtherMatchesText = !isMyMatch && index === 1 && orderedMatches.length > 1;
    const isPlayerInMatch = user && (user.id === item.player1_id || user.id === item.player2_id);

    const renderPlayerImage = (playerId, playerUsername) => (
      <TouchableOpacity 
        onPress={() => handleProfilePress(playerId, playerUsername)}
        activeOpacity={0.7}
      >
        <Animated.View style={[
          styles.profileImageContainer,
          {
            transform: [{ scale: profilePressScale }]
          }
        ]}>
          <Image
            source={{ uri: profileImages[playerId] || '/icons/profile1.png' }}
            style={styles.profileImage}
          />
          <View style={[
            styles.onlineStatus,
            { backgroundColor: userProfiles[playerId]?.status === 'online' ? 'green' : 'red' }
          ]} />
        </Animated.View>
      </TouchableOpacity>
    );

    return (
      <View key={item.id}>
        {isMyMatch && (
          <Text style={[styles.myMatchText, { color: theme.text }]}>My Match</Text>
        )}
        {showOtherMatchesText && (
          <Text style={[styles.otherMatchesText, { color: theme.text }]}>Other Matches</Text>
        )}
        <View style={[styles.matchItem, { backgroundColor: theme.cardBackground }]}>
          {onSetWinner && tournamentStatus === 'in_progress' && item.status === 'scheduled' ? (
            <View style={styles.matchContent}>
              <View style={[styles.winnerButtons, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }]}>
                <View style={styles.playerContainer}>
                  {renderPlayerImage(item.player1_id, item.player1)}
                  <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{item.player1}</Text>
                </View>
                <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    style={[
                      styles.setResultsButton,
                      { backgroundColor: theme.buttonBackground, padding: 10, marginTop: 5 },
                      item.round !== currentRound || (!isCreator && user && user.id !== item.player1_id && user.id !== item.player2_id) ? styles.disabledButton : {},
                      !user ? styles.disabledButton : {}
                    ]}
                    onPress={() => toggleModal(item.id)}
                    disabled={
                      item.round !== currentRound ||
                      (!isCreator && user && user.id !== item.player1_id && user.id !== item.player2_id) ||
                      !user
                    }
                  >
                    <Text style={[styles.setResultsText, { color: theme.buttonText }]}>Set Results</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.setResultsButton,
                      { backgroundColor: theme.buttonBackground, padding: 10, marginTop: 5 },
                      isNotifyButtonDisabled ? styles.disabledButton : {},
                      !user ? styles.disabledButton : {}
                    ]}
                    onPress={() => handleNotifyOpponent(item)}
                    disabled={!(user && (user.id === item.player1_id || user.id === item.player2_id) && item.round === currentRound) || isNotifyButtonDisabled || !user}
                  >
                    <Image
                      source={require('../../assets/bell-icon.png')}
                      style={{ width: 20, height: 20 }}
                    />
                  </TouchableOpacity>
                  {/* Display match password if available AND user is a player in the match */}
                  {isPlayerInMatch ? (
                    matchPasswords[item.id] ? (
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={{ color: theme.text, marginRight: 5 }}>{matchPasswords[item.id]}</Text>
                        <TouchableOpacity onPress={() => {
                          Clipboard.setString(matchPasswords[item.id] || '');
                          Alert.alert("Password Copied", "Password copied to clipboard!");
                        }}>
                          <ClipboardIcon color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={{ color: theme.text }}>Generating...</Text>
                    )
                  ) : null}
                </View>
                <View style={styles.playerContainer}>
                  {renderPlayerImage(item.player2_id, item.player2)}
                  <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{item.player2}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.matchContent}>
              <View style={[styles.completedMatch, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={styles.playerContainer}>
                  {renderPlayerImage(item.player1_id, item.player1)}
                  <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{item.player1}</Text>
                </View>
                <Text style={[styles.scoreText, { width: 50, color: theme.text }]}>{matchScores[item.id] || '0 - 0'}</Text>
                <View style={styles.playerContainer}>
                  {renderPlayerImage(item.player2_id, item.player2)}
                  <Text style={[styles.playerName, { width: 100, color: theme.text }]}>{item.player2}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

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

      <Modal
        isVisible={isPlayerModalVisible}
        onBackdropPress={() => setIsPlayerModalVisible(false)}
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Player Options</Text>
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: theme.buttonBackground }]}
            onPress={handleShowDeck}
          >
            <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Show Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: theme.buttonBackground }]}
            onPress={handleSendMessage}
          >
            <Text style={[styles.modalButtonText, { color: theme.buttonText }]}>Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: theme.error }]}
            onPress={() => setIsPlayerModalVisible(false)}
          >
            <Text style={[styles.modalButtonText, { color: 'white' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={styles.matchesContainer}>
        {orderedMatches.map((item, index) => renderMatchItem({ item, index }))}
      </View>

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
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 3,
  },
  matchContent: {
    flexDirection: 'column',
    alignItems: 'stretch',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  winnerButton: {
    padding: 5,
    borderRadius: 5,
  },
  profileImageContainer: {
    position: 'relative',
    width: 70,
    height: 70,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 20,
  },
  onlineStatus: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
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
    width: '90%',
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
  myMatchText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginLeft: 0,
    textAlign: 'left',
  },
  otherMatchesText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 0,
    textAlign: 'left',
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
  setContainer: {
    marginBottom: 20,
  },
  setLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardListContainer: {
    padding: 10,
  },
  modalContent: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
});
