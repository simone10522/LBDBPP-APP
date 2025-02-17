import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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

    setButtonText('Ricerca Classificata'); // Ripristina il testo del bottone

    // **CANCELLAZIONE RIGA DALLA TABELLA 'ranked' SOLO SE player1 E player2 SONO NULL**
    try {
      const { data: rankedData, error: selectError } = await supabase
        .from('ranked')
        .select('player1, player2')
        .eq('user_id', user.id)
        .single();

      if (selectError) {
        console.error("Error selecting ranked data:", selectError);
        return;
      }

      if (rankedData && rankedData.player1 === null && rankedData.player2 === null) {
        const { error: deleteError } = await supabase
          .from('ranked')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error("Error deleting user from ranked queue:", deleteError);
        } else {
          console.log("User removed from ranked queue.");
        }
      } else {
        console.log("Match found, not deleting row.");
      }
    } catch (error) {
      console.error("Error in delete operation:", error);
    }
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
    if (isSearching) {
      setButtonText('Ricerca in corso');
      const interval = setInterval(() => {
        setButtonText((prevText) => {
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

      return () => clearInterval(interval);
    } else {
      setButtonText('Ricerca Classificata');
    }
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

    try {
      const { error: insertError } = await supabase
        .from('ranked')
        .insert([{ user_id: user.id }]);

      if (insertError) {
        console.error("Error adding to ranked queue:", insertError);
        setIsSearching(false);
        setIsCancelButtonVisible(false);
        return;
      } else {
        console.log("User added to ranked queue.");
        setIsInQueue(true);
      }

      // Use setInterval for periodic checks
      searchIntervalRef.current = setInterval(async () => {
        try {
          const { data: availableMatch, error: matchError } = await supabase
            .from('ranked')
            .select('user_id')
            .neq('user_id', user.id)
            .limit(1)
            .single();

          if (matchError) {
            console.error("Error finding available match:", matchError);
            if (matchError.code !== 'PGRST116') {
              // Handle non-404 errors
              clearInterval(searchIntervalRef.current);
              setIsSearching(false);
              setIsCancelButtonVisible(false);
              return;
            }
          }

          if (availableMatch) {
            const user1 = user.id;
            const user2 = availableMatch.user_id;

            // Clear the interval when a match is found
            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current); // Clear timer as well
            matchFound = true;


            console.log(`Matched users: ${user1} and ${user2}`);
            setIsInQueue(false); // Set isInQueue a false, but now cleanup effect does nothing


            // **RECUPERO NOMI UTENTE E POPOLAMENTO COLONNE PLAYER1 E PLAYER2**
            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user2)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile:", opponentProfileError);
              setIsSearching(false);
              setIsCancelButtonVisible(false);
              return;
            }

            const opponentUsername = opponentProfile?.username;

            // Genera la password per il match
            const matchPasswordGenerated = generateMatchPassword();

            // Aggiorna la tabella 'ranked' con player1, player2 e match_password per ENTRAMBI gli utenti
            const updateRankedTable = async (currentPlayerId, opponentPlayerId, password) => {
              const { error: updateError } = await supabase
                .from('ranked')
                .update({ player1: currentPlayerId, player2: opponentPlayerId, match_password: password })
                .eq('user_id', currentPlayerId); // Trova la riga dell'utente corrente
              if (updateError) {
                console.error(`Error updating ranked table for user ${currentPlayerId}:`, updateError);
              } else {
                console.log(`Ranked table updated for user ${currentPlayerId}`);
              }
            };

            await updateRankedTable(user1, user2, matchPasswordGenerated); // Aggiorna per l'utente corrente
            await updateRankedTable(user2, user1, matchPasswordGenerated); // Aggiorna per l'avversario

            // **RECUPERO PASSWORD DAL DB**
            const { data: rankedData, error: rankedError } = await supabase
              .from('ranked')
              .select('match_password')
              .eq('user_id', user1)
              .single();

            if (rankedError) {
              console.error("Error fetching match password:", rankedError);
              setIsSearching(false);
              setIsCancelButtonVisible(false);
              return;
            }

            setIsSearching(false);
            setIsCancelButtonVisible(false); // Hide cancel button after match
            setOpponentName(opponentUsername); // Imposta il NOME UTENTE dell'avversario
            setMatchPassword(rankedData?.match_password); // Imposta la password del match
          } else {
            console.log("Waiting for another player...");
          }
        } catch (err) {
          console.error("Error in interval check:", err);
          clearInterval(searchIntervalRef.current);
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

  useFocusEffect(
    useCallback(() => {
      // Run when the screen is focused
      return () => {
        // Run when the screen is unfocused
        if (isSearching) {
          handleCancelSearch();
        }
      };
    }, [isSearching])
  );


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isButtonVisible && (
        <TouchableOpacity style={styles.button} onPress={handleRankedMatch} disabled={isSearching}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
      {isSearching && (
        <View style={styles.searchInfoContainer}>
          <Text style={styles.searchText}>Tempo di ricerca: {searchDuration} secondi</Text>
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
          <Text style={styles.matchFoundText}>Match Password: {matchPassword}</Text>
        </View>
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
});

export default RankedScreen;
