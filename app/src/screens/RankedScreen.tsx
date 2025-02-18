import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

const RankedScreen = () => {
  const { isDarkMode, user } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const [isInQueue, setIsInQueue] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [buttonText, setButtonText] = useState('Ricerca Classificata');
  const [searchDuration, setSearchDuration] = useState(0);
  const timerRef = useRef(null);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [isCancelButtonVisible, setIsCancelButtonVisible] = useState(false);
  const searchIntervalRef = useRef(null); // Ref for the search interval
  const [opponentName, setOpponentName] = useState(null); // Stato per il nome dell'avversario
  const [matchPassword, setMatchPassword] = useState(null); // Stato per la password del match
  const navigation = useNavigation();
  const [animatedText, setAnimatedText] = useState('Ricerca in corso');
  const [matchReady, setMatchReady] = useState(false);
  const [matchId, setMatchId] = useState(null); // Stato per memorizzare il matchId
  const [matchStartTime, setMatchStartTime] = useState(null); // Stato per memorizzare l'ora di inizio della ricerca
  const [refreshing, setRefreshing] = useState(false);
  const [isMatchFound, setIsMatchFound] = useState(false); // New state variable
  const [playerCount, setPlayerCount] = useState(0); // Stato per il numero di giocatori in coda

  const generateMatchPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
  };

  const handleCancelSearch = async () => {
    setIsSearching(false);
    clearInterval(timerRef.current);
    clearInterval(searchIntervalRef.current); // Clear the search interval
    setSearchDuration(0);
    setIsButtonVisible(true);
    setIsCancelButtonVisible(false);
    setIsInQueue(false);
    setAnimatedText('Ricerca in corso');
    setButtonText('Ricerca Classificata'); // Ripristina il testo del bottone
    setIsMatchFound(false); // Reset isMatchFound

    // **RIMOZIONE DALLA TABELLA 'ranked_queue'**
    try {
      const { error: deleteError } = await supabase
        .from('ranked_queue')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error("Error deleting user from ranked queue:", deleteError);
      } else {
        console.log("User removed from ranked queue.");
      }
    } catch (error) {
      console.error("Error in delete operation:", error);
    }

    // Aggiorna il numero di giocatori in coda
    fetchPlayerCount();
  };

  useEffect(() => {
    if (!user) {
      console.log("User not logged in.");
      return;
    }
    // **RIMOZIONE COMPLETA DELL'EFFETTO DI CLEANUP AUTOMATICO**
    // Non fare nulla qui, la tabella ranked verrà modificata solo con "Annulla Ricerca"
  }, [user]);


  useEffect(() => {
    let interval;
    if (isSearching) {
      setButtonText('Ricerca in corso');
      interval = setInterval(() => {
        setAnimatedText((prevText) => {
          if (prevText === 'Ricerca in corso') {
            return 'Ricerca in corso.';
          } else if (prevText === 'Ricerca in corso.') {
            return 'Ricerca in corso..';
          } else if (prevText === 'Ricerca in corso..') {
            return 'Ricerca in corso...';
          } else {
            return 'Ricerca in corso';
          }
        });
      }, 500);
    } else {
      setButtonText('Ricerca Classificata');
      clearInterval(interval);
      setAnimatedText('Ricerca in corso');
    }

    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    if (isSearching) {
      timerRef.current = setInterval(() => {
        setSearchDuration((prevDuration) => prevDuration + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setSearchDuration(0);
    }

    return () => clearInterval(timerRef.current);
  }, [isSearching]);

  const handleCopyToClipboard = async (text) => {
    Clipboard.setString(text);
    Alert.alert('Password Copiata', 'La password del match è stata copiata negli appunti!');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-fetch any data here that needs to be refreshed
    // For example, you might want to re-run the search query
    // or check for an existing match

    // After the refresh is complete, set refreshing to false
    fetchPlayerCount();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000); // Simulate a 1-second loading time
  }, []);

  const handleSearchAnotherMatch = () => {
    setIsSearching(false);
    clearInterval(timerRef.current);
    clearInterval(searchIntervalRef.current);
    setSearchDuration(0);
    setIsButtonVisible(true);
    setIsCancelButtonVisible(false);
    setIsInQueue(false);
    setAnimatedText('Ricerca in corso');
    setButtonText('Ricerca Classificata');
    setOpponentName(null);
    setMatchPassword(null);
    setMatchReady(false);
    setMatchId(null);
    setMatchStartTime(null);
    setIsMatchFound(false);
  };

  const fetchPlayerCount = async () => {
    try {
      const { count, error } = await supabase
        .from('ranked_queue')
        .select('*', { count: 'exact' });

      if (error) {
        console.error("Error fetching player count:", error);
      } else {
        setPlayerCount(count);
      }
    } catch (error) {
      console.error("Error fetching player count:", error);
    }
  };

  useEffect(() => {
    fetchPlayerCount();
  }, []);


  const handleRankedMatch = async () => {
    if (!user) {
      console.log("User not logged in.");
      return;
    }

    console.log("Current user ID:", user.id);
    setIsSearching(true);
    setIsCancelButtonVisible(true);
    setIsButtonVisible(false);
    let matchFound = false;

    // Store the start time of the match
    const startTime = new Date();
    setMatchStartTime(startTime);

    try {
      // **INSERIMENTO NELLA TABELLA 'ranked_queue'**
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile data:", profileError);
        setIsSearching(false);
        setIsCancelButtonVisible(false);
        return;
      }

      const username = profileData?.username;

      const { error: insertError } = await supabase
        .from('ranked_queue')
        .insert([{ user_id: user.id, username: username }]);

      if (insertError) {
        console.error("Error adding to ranked queue:", insertError);
        setIsSearching(false);
        setIsCancelButtonVisible(false);
        return;
      } else {
        console.log("User added to ranked queue.");
        setIsInQueue(true);
      }

      // Aggiorna il numero di giocatori in coda
      fetchPlayerCount();

      // Use setInterval for periodic checks
      searchIntervalRef.current = setInterval(async () => {
        try {
          // Check if a match already exists for the current user, filtering by start time
          const { data: existingMatch, error: existingMatchError } = await supabase
            .from('ranked')
            .select('match_id, match_password, player1, player2, user_id, created_at')
            .or(`player1.eq.${user.id},player2.eq.${user.id}`)
            .gt('created_at', startTime.toISOString()) // Filter by creation date
            .single();

          if (existingMatchError && existingMatchError.code !== 'PGRST116') {
            console.error("Error checking for existing match:", existingMatchError);
            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current);
            setIsSearching(false);
            setIsCancelButtonVisible(false);
            return;
          }

          if (existingMatch) {
            // Match already exists, fetch details
            console.log("Match already exists for this user.");
            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current);
            setIsSearching(false);
            setIsCancelButtonVisible(false);
            setIsMatchFound(true); // Show the button for the second player

            const opponentId = existingMatch.player1 === user.id ? existingMatch.player2 : existingMatch.player1;

            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', opponentId)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile:", opponentProfileError);
              setOpponentName('Sconosciuto');
            } else {
              setOpponentName(opponentProfile?.username);
            }

            setMatchPassword(existingMatch.match_password);
            setMatchReady(true);
            setIsMatchFound(true); // Show the button for the second player
            return;
          }


          const { data: availableMatch, error: matchError } = await supabase
            .from('ranked_queue')
            .select('user_id, username')
            .neq('user_id', user.id)
            .limit(1)
            .single();

          if (matchError) {
            console.error("Error finding available match:", matchError);
            if (matchError.code !== 'PGRST116') {
              // Handle non-404 errors
              clearInterval(searchIntervalRef.current);
              clearInterval(timerRef.current);
              setIsSearching(false);
              setIsCancelButtonVisible(false);
              return;
            }
          }

          if (availableMatch) {
            const user1 = user.id;
            const user2 = availableMatch.user_id;
            const opponentUsername = availableMatch.username;

            // Generate match_id
            const matchIdGenerated = uuidv4();
            setMatchId(matchIdGenerated);

            // Genera la password per il match SOLO QUI
            const matchPasswordGenerated = generateMatchPassword();

            // Clear the interval when a match is found
            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current); // Clear timer as well
            matchFound = true;


            console.log(`Matched users: ${user1} and ${user2}`);
            setIsInQueue(false); // Set isInQueue a false, but now cleanup effect does nothing

            // Primo giocatore crea la row nella tabella 'ranked'
            const createRankedMatch = async (currentPlayerId, opponentPlayerId, matchId, password) => {
              const { error: createError } = await supabase
                .from('ranked')
                .insert([{
                  player1: currentPlayerId,
                  player2: opponentPlayerId,
                  match_id: matchId,
                  match_password: password,
                  user_id: currentPlayerId // Imposta l'user_id del creatore
                }]);

              if (createError) {
                console.error(`Error creating ranked match for user ${currentPlayerId}:`, createError);
              } else {
                console.log(`Ranked match created for user ${currentPlayerId}`);
              }
            };

            await createRankedMatch(user1, user2, matchIdGenerated, matchPasswordGenerated);

            // **ELIMINAZIONE DALLA TABELLA 'ranked_queue'**
            const deleteFromRankedQueue = async (userId) => {
              const { error: deleteError } = await supabase
                .from('ranked_queue')
                .delete()
                .eq('user_id', userId);

              if (deleteError) {
                console.error(`Error deleting user ${userId} from ranked_queue:`, deleteError);
              } else {
                console.log(`User ${userId} deleted from ranked_queue`);
              }
            };

            await deleteFromRankedQueue(user1);
            await deleteFromRankedQueue(user2);

            setIsSearching(false);
            setIsCancelButtonVisible(false); // Hide cancel button after match
            setOpponentName(opponentUsername); // Imposta il NOME UTENTE dell'avversario
            setMatchPassword(matchPasswordGenerated); // Imposta la password del match
            setMatchReady(true);
            setIsMatchFound(true); // Set isMatchFound to true
          } else {
            console.log("Waiting for another player...");
          }
        } catch (err) {
          console.error("Error in interval check:", err);
          clearInterval(searchIntervalRef.current);
          clearInterval(timerRef.current);
          setIsSearching(false);
          setIsCancelButtonVisible(false);
        }
      }, 3000); // Check every 3 seconds (adjust as needed)

    } catch (error) {
      console.error("Error in ranked match handling:", error);
      setIsSearching(false);
      setIsCancelButtonVisible(false);
    }
  };

  const transferMatchToStorage = async (matchId) => {
    try {
      // Fetch the match data from the 'ranked' table
      const { data: matchData, error: fetchError } = await supabase
        .from('ranked')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (fetchError) {
        console.error("Error fetching match data:", fetchError);
        return;
      }

      // Insert the match data into the 'ranked_storage' table
      const { error: insertError } = await supabase
        .from('ranked_storage')
        .insert([matchData]);

      if (insertError) {
        console.error("Error inserting into ranked_storage:", insertError);
        return;
      }

      // Delete the match from the 'ranked' table
      const { error: deleteError } = await supabase
        .from('ranked')
        .delete()
        .eq('match_id', matchId);

      if (deleteError) {
        console.error("Error deleting from ranked:", deleteError);
        return;
      }

      console.log("Match transferred to ranked_storage and deleted from ranked.");
    } catch (error) {
      console.error("Error transferring match:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Run when the screen is focused
      fetchPlayerCount();
      return () => {
        // Run when the screen is unfocused
        // Check if a match_id exists before calling handleCancelSearch
        const checkAndCancelSearch = async () => {
          const { data: rankedData, error: selectError } = await supabase
            .from('ranked_queue')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

          if (selectError) {
            console.error("Error selecting ranked data:", selectError);
            return;
          }

          if (rankedData) {
            handleCancelSearch();
          } else {
            console.log("User not in ranked queue.");
          }
        };

        checkAndCancelSearch();
      };
    }, [user])
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text} // Apply theme to refreshControl
          />
        }
      >
        <Text style={[styles.text, { color: theme.text }]}>Giocatori in coda: {playerCount}</Text>
        {isButtonVisible && (
          <TouchableOpacity style={styles.button} onPress={handleRankedMatch} disabled={isSearching}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        )}
        {isSearching && (
          <View style={styles.searchInfoContainer}>
            <Text style={[styles.searchText, { color: 'red', fontSize: 20, fontWeight: 'bold' }]}>{animatedText}</Text>
            <Text style={[styles.searchText, { color: 'red', fontSize: 20, fontWeight: 'bold' }]}>Tempo di ricerca: {searchDuration} secondi</Text>
            {isCancelButtonVisible && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}>
                <Text style={styles.cancelButtonText}>Annulla Ricerca</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {opponentName && matchPassword && (
          <View style={styles.matchFoundContainer}>
            <Text style={styles.matchFoundText}>Avversario trovato: {opponentName}</Text>
            <TouchableOpacity onPress={() => handleCopyToClipboard(matchPassword)}>
              <Text style={styles.matchFoundText}>Match Password: {matchPassword}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {isMatchFound && (
        <TouchableOpacity style={styles.searchAnotherButton} onPress={handleSearchAnotherMatch}>
          <Text style={styles.searchAnotherButtonText}>Cerca un'altra partita</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInfoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  searchText: {
    fontSize: 16,
    marginBottom: 10,
    color: 'grey',
  },
  matchFoundContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  matchFoundText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745', // Verde per indicare successo
  },
  searchAnotherButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchAnotherButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RankedScreen;
