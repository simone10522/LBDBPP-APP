//No changes needed, just for context
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import RankedSearch from '../components/RankedSearch';
import RankedSearchAnimation from '../components/RankedSearchAnimation'; // Importa il nuovo componente

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
  const searchIntervalRef = useRef(null);
  const navigation = useNavigation();
  const [animatedText, setAnimatedText] = useState('Ricerca in corso');
  const [refreshing, setRefreshing] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [matchId, setMatchId] = useState(null);
  const [matchStartTime, setMatchStartTime] = useState(null);
  const mounted = useRef(false); // Add a ref to track component mount status

  useEffect(() => {
    if (!user) {
      console.log("User not logged in.");
      return;
    }
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlayerCount();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleCancelSearch = async () => {
    setIsSearching(false);
    clearInterval(timerRef.current);
    clearInterval(searchIntervalRef.current);
    setSearchDuration(0);
    setIsButtonVisible(true);
    setIsCancelButtonVisible(false);
    setIsInQueue(false);
    setAnimatedText('Ricerca in corso');
    setButtonText('Ricerca Classificata');

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

    fetchPlayerCount();
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchPlayerCount();
    }, 10000); // Update every 10 seconds (adjust as needed)

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, []);


  const generateMatchPassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
  };

  const handleRankedMatch = async () => {
    if (!user) {
      console.log("User not logged in.");
      return;
    }

    console.log("Current user ID:", user.id);
    setIsSearching(true);
    setIsCancelButtonVisible(true);
    setIsButtonVisible(false);

    const startTime = new Date();
    setMatchStartTime(startTime);

    try {
      // Check if the user is already in the ranked queue
      const { data: existingUser, error: existingUserError } = await supabase
        .from('ranked_queue')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (existingUserError && existingUserError.code !== 'PGRST116') {
        console.error("Error checking for existing user in ranked queue:", existingUserError);
        setIsSearching(false);
        setIsCancelButtonVisible(false);
        return;
      }

      if (existingUser) {
        console.log("User already in ranked queue.");
        setIsSearching(false);
        setIsCancelButtonVisible(false);
        return;
      }

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

      fetchPlayerCount();

      searchIntervalRef.current = setInterval(async () => {
        try {
          const { data: existingMatch, error: existingMatchError } = await supabase
            .from('ranked')
            .select('match_id, match_password, player1, player2, user_id, created_at, winner, confirmed')
            .or(`player1.eq.${user.id},player2.eq.${user.id}`)
            .gt('created_at', startTime.toISOString())
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
            console.log("Match already exists for this user.");
            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current);
            setIsSearching(false);
            setIsCancelButtonVisible(false);

            const opponentId = existingMatch.player1 === user.id ? existingMatch.player2 : existingMatch.player1;

            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('username, profile_image')
              .eq('id', opponentId)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile:", opponentProfileError);
              return;
            }

            const opponentName = opponentProfile?.username;
            const opponentProfileImage = opponentProfile?.profile_image;
            const matchPassword = existingMatch.match_password;
            const matchId = existingMatch.match_id;

            navigation.navigate('Match', {
              opponentName,
              matchPassword,
              opponentProfileImage,
              matchId,
              opponentId,
            });

            return;
          }

          console.log("Searching for available match..."); // ADDED LOG
          const { data: availableMatch, error: matchError } = await supabase
            .from('ranked_queue')
            .select('user_id, username')
            .neq('user_id', user.id)
            .limit(1)
            .single();

          if (matchError) {
            if (matchError.code === 'PGRST116') {
              console.log("No available players in queue."); // MORE SPECIFIC LOG
            } else {
              console.error("Error finding available match:", matchError);
            }
            if (matchError.code !== 'PGRST116') {
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

            const matchIdGenerated = uuidv4();
            setMatchId(matchIdGenerated);

            const matchPasswordGenerated = generateMatchPassword();

            clearInterval(searchIntervalRef.current);
            clearInterval(timerRef.current);

            console.log(`Matched users: ${user1} and ${user2}`);
            setIsInQueue(false);

            const createRankedMatch = async (currentPlayerId, opponentPlayerId, matchId, password) => {
              const { error: createError } = await supabase
                .from('ranked')
                .insert([{
                  player1: currentPlayerId,
                  player2: opponentPlayerId,
                  match_id: matchId,
                  match_password: password,
                  user_id: currentPlayerId,
                  winner: null,
                  confirmed: null,
                }]);

              if (createError) {
                console.error(`Error creating ranked match for user ${currentPlayerId}:`, createError);
              } else {
                console.log(`Ranked match created for user ${currentPlayerId}`);
              }
            };

            await createRankedMatch(user1, user2, matchIdGenerated, matchPasswordGenerated);

            const deleteFromRankedQueue = async (userId) => {
              console.log(`Attempting to delete user ${userId} from ranked_queue`); // LOG BEFORE DELETE
              const { error: deleteError } = await supabase
                .from('ranked_queue')
                .delete()
                .eq('user_id', userId);

              if (deleteError) {
                console.error(`Error deleting user ${userId} from ranked_queue:`, deleteError);
              } else {
                console.log(`User ${userId} deleted from ranked_queue successfully`); // SUCCESS LOG
              }
            };

            await deleteFromRankedQueue(user1);
            await deleteFromRankedQueue(user2);

            setIsSearching(false);
            setIsCancelButtonVisible(false);

            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('profile_image')
              .eq('id', user2)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile image:", opponentProfileError);
              return;
            }

            const opponentProfileImage = opponentProfile?.profile_image;

            navigation.navigate('Match', {
              opponentName: opponentUsername,
              matchPassword: matchPasswordGenerated,
              opponentProfileImage: opponentProfileImage,
              matchId: matchIdGenerated,
              opponentId: user2,
            });
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
      }, 3000);

    } catch (error) {
      console.error("Error in ranked match handling:", error);
      setIsSearching(false);
      setIsCancelButtonVisible(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // mounted.current = true; // Set mounted to true when the screen comes into focus

      const checkAndCancelSearch = async () => {
        // if (!mounted.current) {
        //   console.log("Component not fully mounted, skipping queue check.");
        //   return;
        // }

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
          // handleCancelSearch();
        } else {
          console.log("User not in ranked queue.");
        }
      };

      // checkAndCancelSearch();
      const blurListener = navigation.addListener('blur', () => {
        if (isSearching) {
          Alert.alert(
            "Interruzione Ricerca",
            "Se cambi pagina, la ricerca verrà interrotta. Vuoi continuare?",
            [
              {
                text: "Annulla",
                style: "cancel"
              },
              {
                text: "OK",
                onPress: () => {
                  handleCancelSearch(); // Call handleCancelSearch when the user confirms
                }
              }
            ],
            { cancelable: false }
          );
        }
      });

      return () => {
        blurListener(); // Clean up the listener when the component unmounts or loses focus
      };

    }, [user, handleCancelSearch, isSearching, navigation]) // Include isSearching and navigation in the dependency array
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
      >
        <Text style={[styles.playerCountText, { color: theme.text }]}>Giocatori in coda: {playerCount}</Text>
        {isSearching ? (
          <View style={styles.animationContainer}>
            <RankedSearchAnimation isDarkMode={isDarkMode} />
            <Text style={[styles.searchingText, { color: theme.text }]}>{animatedText}</Text>
            <Text style={[styles.searchDurationText, { color: theme.text }]}>
              Tempo di ricerca: {searchDuration} secondi
            </Text>
            {isCancelButtonVisible && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSearch}>
                <Text style={styles.cancelButtonText}>Annulla Ricerca</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <RankedSearch
            isSearching={isSearching}
            searchDuration={searchDuration}
            isCancelButtonVisible={isCancelButtonVisible}
            buttonText={buttonText}
            animatedText={animatedText}
            onPressSearch={handleRankedMatch}
            onPressCancel={handleCancelSearch}
            isMatchFound={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  searchingText: {
    fontSize: 18,
    marginTop: 10,
  },
  searchDurationText: {
    fontSize: 14,
    marginTop: 5,
    color: 'grey',
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
});

export default RankedScreen;
