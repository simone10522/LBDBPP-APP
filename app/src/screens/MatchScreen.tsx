import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { supabase } from '../lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import MatchConfirmation from '../components/MatchConfirmation';
import { Copy, Check } from 'lucide-react-native';

const MatchScreen = () => {
  const { isDarkMode, user } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const navigation = useNavigation();
  const route = useRoute();

  const { opponentName, matchPassword, opponentProfileImage, matchId, opponentId } = route.params || {};

  const [userProfileImage, setUserProfileImage] = useState(null);
  const [userImageClicked, setUserImageClicked] = useState(false);
  const [opponentImageClicked, setOpponentImageClicked] = useState(false);
  const [isConfirmButtonActive, setIsConfirmButtonActive] = useState(false);
  const [userWinnerSelection, setUserWinnerSelection] = useState(null);
  const [winnerConfirmed, setWinnerConfirmed] = useState(false);
  const [timer, setTimer] = useState(60);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [intervalIdRef, setIntervalIdRef] = useState(null);
  const [showTimer, setShowTimer] = useState(true);
  const [winnerNotConfirmed, setWinnerNotConfirmed] = useState(false); // Nuovo stato
  const imageY = useSharedValue(500);

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
      imageY.value = withSpring(500, { // Ensure it animates back down if the image is removed
        damping: 10,
        stiffness: 80,
      });
    }
  }, [opponentProfileImage]);

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: imageY.value }],
    };
  });

  const handleCopyToClipboard = async (text) => {
    Clipboard.setString(text);
  };

  const handleUserImagePress = async () => {
    setUserImageClicked(prev => !prev);
    setOpponentImageClicked(false);
    setIsConfirmButtonActive(true);
    setUserWinnerSelection(user.id);
    console.log("User selected as winner:", user.id);
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
          .select('winner, confirmed') // MODIFIED: Select winner as well
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
        // If selections match and opponent is awaiting, confirm match
        const { error: confirmedError } = await supabase
          .from('ranked')
          .update({ confirmed: 'confirmed' })
          .eq('match_id', matchId);

        if (confirmedError) {
          console.error("Error updating confirmed status:", confirmedError);
          return;
        }

        setWinnerConfirmed(true);
        setWinnerNotConfirmed(false); // Reset winnerNotConfirmed
        setAwaitingConfirmation(false);
        if (intervalIdRef) {
          clearInterval(intervalIdRef);
        }
      } else if (existingWinner !== null && existingWinner !== userWinnerSelection && confirmedStatus === 'awaiting') {
        // If selections do not match and opponent is awaiting, set to non_confirmed
        console.log("Mismatched winner selections detected.");
        const { error: nonConfirmedError } = await supabase
          .from('ranked')
          .update({ confirmed: 'non_confirmed' })
          .eq('match_id', matchId);

        if (nonConfirmedError) {
          console.error("Error updating confirmed status to non_confirmed:", nonConfirmedError);
          return;
        }
        setAwaitingConfirmation(false); // No longer awaiting confirmation
        setShowTimer(false); // Hide timer
        setWinnerConfirmed(false);
        setWinnerNotConfirmed(true); // Set winnerNotConfirmed a true
      } else {
        console.log("No action taken based on existing winner data.");
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
            // setMatchConfirmed(true);
            clearInterval(intervalId);
            setAwaitingConfirmation(false);
            setShowTimer(false);
            setWinnerConfirmed(true);
            setWinnerNotConfirmed(false); // Reset winnerNotConfirmed when confirmed
          } else if (data?.confirmed === 'non_confirmed') { // Check for 'non_confirmed' status
            clearInterval(intervalId);
            setAwaitingConfirmation(false);
            setShowTimer(false);
            setWinnerConfirmed(false);
            setWinnerNotConfirmed(true); // Set winnerNotConfirmed to true
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          winnerNotConfirmed={winnerNotConfirmed} // Passa la nuova prop
        />
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
});

export default MatchScreen;
