import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import { Copy, Check, X } from 'lucide-react-native'; // Importa l'icona X

const MatchConfirmation = ({
  opponentName,
  matchPassword,
  opponentProfileImage,
  userProfileImage,
  userImageClicked,
  opponentImageClicked,
  isConfirmButtonActive,
  winnerConfirmed,
  animatedImageStyle,
  theme,
  handleCopyToClipboard,
  handleUserImagePress,
  handleOpponentImagePress,
  handleConfirmWinner,
  awaitingConfirmation,
  timer,
  showTimer,
  winnerNotConfirmed, // Nuova prop
}) => {
  const translateXUser = useSharedValue(-300);
  const translateXOpponent = useSharedValue(300);
  const [isButtonHidden, setIsButtonHidden] = useState(false); // Nuovo stato per nascondere il pulsante

  const animatedUserImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateXUser.value }],
    };
  });

  const animatedOpponentImageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateXOpponent.value }],
    };
  });

  useEffect(() => {
    translateXUser.value = withSpring(0, { damping: 10, stiffness: 90 });
    translateXOpponent.value = withSpring(0, { damping: 10, stiffness: 90 });
  }, []);


  const handleConfirmWinnerPress = () => {
    if (!isButtonHidden) {
      setIsButtonHidden(true); // Nascondi il pulsante immediatamente
      handleConfirmWinner(); // Chiama la funzione originale per confermare il vincitore
    }
  };


  return (
    <View style={[styles.matchContainer, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: theme.text }]}>Match Found!</Text>
      </View>

      <View style={styles.playersContainer}>
        <TouchableOpacity onPress={handleUserImagePress} style={styles.playerBox}>
          <Animated.Image
            style={[
              styles.profileImage,
              userImageClicked && styles.selectedImage,
              animatedUserImageStyle,
            ]}
            source={{ uri: userProfileImage }}
          />
          <Text style={[styles.playerName, { color: theme.text }]}>You</Text>
        </TouchableOpacity>

        <View style={styles.vsContainer}>
          <Text style={[styles.vsText, { color: theme.text }]}>VS</Text>
        </View>

        <TouchableOpacity onPress={handleOpponentImagePress} style={styles.playerBox}>
          {opponentProfileImage ? (
            <Animated.Image
              style={[
                styles.profileImage,
                opponentImageClicked && styles.selectedImage,
                animatedOpponentImageStyle,
              ]}
              source={{ uri: opponentProfileImage }}
            />
          ) : (
            <View style={[styles.profileImage, { backgroundColor: 'gray' }]} />
          )}
          <Text style={[styles.playerName, { color: theme.text }]}>{opponentName}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.matchInfoContainer}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>Opponent:</Text>
          <Text style={[styles.infoText, { color: theme.text }]}>{opponentName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.text }]}>Match Password:</Text>
          <TouchableOpacity onPress={() => handleCopyToClipboard(matchPassword)}>
            <View style={styles.copyContainer}>
              <Text style={[styles.infoText, { color: theme.text, marginRight: 10 }]}>{matchPassword}</Text>
              <Copy size={16} color={theme.text} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {awaitingConfirmation && showTimer && (
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: theme.text }]}>
            Awaiting confirmation: {timer}
            {console.log("Timer prop in MatchConfirmation:", timer)}
          </Text>
        </View>
      )}

      {winnerConfirmed && !winnerNotConfirmed && ( // Condizione aggiornata
        <View style={styles.confirmationContainer}>
          <Text style={[styles.confirmationText, { color: theme.text }]}>
            Winner confirmed!
          </Text>
          <Check size={24} color={theme.text} />
        </View>
      )}

      {winnerNotConfirmed && ( // Nuovo blocco per "Winner not confirmed!"
        <View style={styles.confirmationContainer}>
          <Text style={[styles.confirmationText, { color: theme.text }]}>
            Winner not confirmed!
          </Text>
          <X size={24} color={theme.text} />  {/* Usa l'icona X per indicare non confermato */}
        </View>
      )}

      {!isButtonHidden && (
        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: isConfirmButtonActive ? theme.buttonBackground : theme.inputBackground,
            },
          ]}
          onPress={handleConfirmWinnerPress}
          disabled={!isConfirmButtonActive}
        >
          <Text style={[styles.confirmButtonText, { color: theme.text }]}>Confirm Winner</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  matchContainer: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  playerBox: {
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  selectedImage: {
    borderColor: 'blue',
    borderWidth: 2,
  },
  playerName: {
    fontSize: 16,
  },
  vsContainer: {
    marginHorizontal: 10,
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  matchInfoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerContainer: {
    marginBottom: 10,
  },
  timerText: {
    fontSize: 16,
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmationText: {
    fontSize: 16,
    marginRight: 5,
  },
  confirmButton: {
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MatchConfirmation;
