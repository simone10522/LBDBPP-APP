import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, ScrollView, RefreshControl, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import RankedSearch from '../components/RankedSearch';
import MatchConfirmation from '../components/MatchConfirmation';
import { Copy, Check } from 'lucide-react-native';

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
  const [opponentName, setOpponentName] = useState(null);
  const [matchPassword, setMatchPassword] = useState(null);
  const navigation = useNavigation();
  const [animatedText, setAnimatedText] = useState('Ricerca in corso');
  const [matchReady, setMatchReady] = useState(false);
  const [matchId, setMatchId] = useState(null);
  const [matchStartTime, setMatchStartTime] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMatchFound, setIsMatchFound] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [opponentProfileImage, setOpponentProfileImage] = useState(null);
  const imageY = useSharedValue(500);
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [userImageClicked, setUserImageClicked] = useState(false);
  const [opponentImageClicked, setOpponentImageClicked] = useState(false);
  const [isConfirmButtonActive, setIsConfirmButtonActive] = useState(false);
  const [userWinnerSelection, setUserWinnerSelection] = useState(null);
  const [opponentWinnerSelection, setOpponentWinnerSelection] = useState(null);
  const [winnerConfirmed, setWinnerConfirmed] = useState(false);
  const [opponentId, setOpponentId] = useState(null);
  const [timer, setTimer] = useState(60);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [winnerProfileImage, setWinnerProfileImage] = useState(null);
  const [winnerUsername, setWinnerUsername] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [intervalIdRef, setIntervalIdRef] = useState(null);
  const [showTimer, setShowTimer] = useState(true);

  useEffect(() => {
    const fetchUserProfileImage = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('profile_image')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile image:", profileError);
        setUserProfileImage(null);
      } else {
        setUserProfileImage(profileData?.profile_image);
      }
    };

    if (user) {
      fetchUserProfileImage();
    }
  }, [user]);

  useEffect(() => {
    if (opponentProfileImage) {
      imageY.value = withSpring(0, {
        damping: 10,
        stiffness: 80,
      });
    } else {
      imageY.value = 500;
    }
  }, [opponentProfileImage]);

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: imageY.value }],
    };
  });

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
    clearInterval(searchIntervalRef.current);
    setSearchDuration(0);
    setIsButtonVisible(true);
    setIsCancelButtonVisible(false);
    setIsInQueue(false);
    setAnimatedText('Ricerca in corso');
    setButtonText('Ricerca Classificata');
    setIsMatchFound(false);

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

  const handleCopyToClipboard = async (text) => {
    Clipboard.setString(text);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlayerCount();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
    setWinnerConfirmed(false);
    setAwaitingConfirmation(false);
    setMatchConfirmed(false);
    setWinnerProfileImage(null);
    setWinnerUsername(null);
    setWinnerId(null);
    setTimer(60);
    setShowTimer(true);
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

    const startTime = new Date();
    setMatchStartTime(startTime);

    try {
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
            setIsMatchFound(true);

            const opponentId = existingMatch.player1 === user.id ? existingMatch.player2 : existingMatch.player1;

            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('username, profile_image')
              .eq('id', opponentId)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile:", opponentProfileError);
              setOpponentName('Sconosciuto');
            } else {
              setOpponentName(opponentProfile?.username);
              setOpponentProfileImage(opponentProfile?.profile_image);
              setOpponentId(opponentId);
            }

            setMatchPassword(existingMatch.match_password);
            setMatchReady(true);
            setIsMatchFound(true);
            console.log("Existing match ID:", existingMatch.match_id);
            setMatchId(existingMatch.match_id);
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
            matchFound = true;

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
            setIsCancelButtonVisible(false);
            setOpponentName(opponentUsername);

            const { data: opponentProfile, error: opponentProfileError } = await supabase
              .from('profiles')
              .select('profile_image')
              .eq('id', user2)
              .single();

            if (opponentProfileError) {
              console.error("Error fetching opponent profile image:", opponentProfileError);
              setOpponentProfileImage(null);
            } else {
              setOpponentProfileImage(opponentProfile?.profile_image);
            }

            setMatchPassword(matchPasswordGenerated);
            setMatchReady(true);
            setIsMatchFound(true);
            setOpponentId(user2);
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

  const transferMatchToStorage = async (matchId) => {
    try {
      const { data: matchData, error: fetchError } = await supabase
        .from('ranked')
        .select('*')
        .eq('match_id', matchId)
        .single();

      if (fetchError) {
        console.error("Error fetching match data:", fetchError);
        return;
      }

      const { error: insertError } = await supabase
        .from('ranked_storage')
        .insert([matchData]);

      if (insertError) {
        console.error("Error inserting into ranked_storage:", insertError);
        return;
      }

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
      fetchPlayerCount();
      return () => {
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

  const handleProfilePress = (userId) => {
    navigation.navigate('Profile', { userId: userId });
  };

  const handleUserImagePress = async () => {
    setUserImageClicked(prev => !prev);
    setOpponentImageClicked(false);
    setIsConfirmButtonActive(true);
    setUserWinnerSelection(user.id);
    console.log("User selected as winner:", user.id);
    setWinnerId(user.id);
    try {
      const { error } = await supabase
        .from('ranked')
        .update({ confirmed: 'awaiting' })
        .eq('match_id', matchId);

      if (error) {
        console.error("Error updating confirmed status:", error);
      } else {
        console.log("Confirmed status updated to awaiting.");
      }
    } catch (error) {
      console.error("Error updating confirmed status:", error);
    }
  };

  const handleOpponentImagePress = async () => {
    setOpponentImageClicked(prev => !prev);
    setUserImageClicked(false);
    setIsConfirmButtonActive(true);
    setUserWinnerSelection(opponentId);
    console.log("Opponent selected as winner:", opponentId);
    setWinnerId(opponentId);
    try {
      const { error } = await supabase
        .from('ranked')
        .update({ confirmed: 'awaiting' })
        .eq('match_id', matchId);

      if (error) {
        console.error("Error updating confirmed status:", error);
      } else {
        console.log("Confirmed status updated to awaiting.");
      }
    } catch (error) {
      console.error("Error updating confirmed status:", error);
    }
  };

  const handleConfirmWinner = async () => {
    if (!userWinnerSelection) {
      return;
    }

    try {
      const checkWinnerSelection = async (matchId) => {
        console.log("Checking winner selection for matchId:", matchId);
        const { data, error } = await supabase
          .from('ranked')
          .select('winner, confirmed')
          .eq('match_id', matchId)
          .single();

        if (error) {
          console.error("Error fetching winner selection:", error);
          return null;
        }
        console.log("Existing winner selection:", data?.winner);
        return { winner: data?.winner, confirmed: data?.confirmed };
      };

      const storeWinnerSelection = async (matchId, winner) => {
        console.log("Storing winner selection for matchId:", matchId, "winner:", winner);
        const { error } = await supabase
          .from('ranked')
          .update({ winner: winner })
          .eq('match_id', matchId);

        if (error) {
          console.error("Error storing winner selection:", error);
          return false;
        }
        console.log("Winner selection stored successfully.");
        return true;
      };

      const existingWinnerData = await checkWinnerSelection(matchId);
      const existingWinner = existingWinnerData?.winner;
      const confirmedStatus = existingWinnerData?.confirmed;

      if (existingWinner === null) {
        const storeResult = await storeWinnerSelection(matchId, userWinnerSelection);
        if (!storeResult) {
          return;
        }
        setAwaitingConfirmation(true);

        setTimer(60);
        const intervalId = setInterval(() => {
          setTimer((prevTimer) => {
            if (prevTimer > 0) {
              return prevTimer - 1;
            } else {
              clearInterval(intervalId);
              return 0;
            }
          });
        }, 1000);
        setIntervalIdRef(intervalId);

        return () => clearInterval(intervalId);
      } else if (existingWinner === userWinnerSelection && confirmedStatus === 'awaiting') {
        const { error: confirmedError } = await supabase
          .from('ranked')
          .update({ confirmed: 'confirmed' })
          .eq('match_id', matchId);

        if (confirmedError) {
          console.error("Error updating confirmed status:", confirmedError);
          return;
        }

        setWinnerConfirmed(true);
        setAwaitingConfirmation(false);
        if (intervalIdRef) {
          clearInterval(intervalIdRef);
        }
      } else {
      }

    } catch (error) {
      console.error("Error confirming winner:", error);
    }
  };

  useEffect(() => {
    let intervalId;
    if (awaitingConfirmation && matchId) {
      intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('ranked')
            .select('confirmed')
            .eq('match_id', matchId)
            .single();

          if (error) {
            console.error("Error fetching confirmed status:", error);
          } else if (data?.confirmed === 'confirmed') {
            setMatchConfirmed(true);
            clearInterval(intervalId);
            setAwaitingConfirmation(false);
            setShowTimer(false);
          }
        } catch (error) {
          console.error("Error checking confirmed status:", error);
          clearInterval(intervalId);
        }
      }, 3000);
    }

    return () => clearInterval(intervalId);
  }, [awaitingConfirmation, matchId]);

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
        <Text style={[styles.text, { color: theme.text }]}>Giocatori in coda: {playerCount}</Text>
        <RankedSearch
          isSearching={isSearching}
          searchDuration={searchDuration}
          isCancelButtonVisible={isCancelButtonVisible}
          buttonText={buttonText}
          animatedText={animatedText}
          onPressSearch={handleRankedMatch}
          onPressCancel={handleCancelSearch}
          isMatchFound={isMatchFound} // Pass isMatchFound prop
        />
        {opponentName && matchPassword && (
          <MatchConfirmation
            opponentName={opponentName}
            matchPassword={matchPassword}
            opponentProfileImage={opponentProfileImage}
            userProfileImage={userProfileImage}
            userImageClicked={userImageClicked}
            opponentImageClicked={opponentImageClicked}
            isConfirmButtonActive={isConfirmButtonActive}
            winnerConfirmed={winnerConfirmed}
            animatedImageStyle={animatedImageStyle}
            theme={theme}
            handleCopyToClipboard={handleCopyToClipboard}
            handleUserImagePress={handleUserImagePress}
            handleOpponentImagePress={handleOpponentImagePress}
            handleConfirmWinner={handleConfirmWinner}
            awaitingConfirmation={awaitingConfirmation}
            timer={timer}
            showTimer={showTimer}
          />
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
    fontWeight:'bold',
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
  winnerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  winnerLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  winnerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  winnerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RankedScreen;
