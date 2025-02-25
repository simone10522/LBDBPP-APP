import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

interface MatchConfirmationProps {
  opponentName: string | null;
  matchPassword: string | null;
  opponentProfileImage: string | null;
  userProfileImage: string | null;
  userImageClicked: boolean;
  opponentImageClicked: boolean;
  isConfirmButtonActive: boolean;
  winnerConfirmed: boolean;
  animatedImageStyle: Animated.AnimatedStyle<any>;
  theme: any;
  handleCopyToClipboard: (text: string) => void;
  handleUserImagePress: () => void;
  handleOpponentImagePress: () => void;
  handleConfirmWinner: () => void;
  awaitingConfirmation: boolean;
  timer: number;
  showTimer: boolean;
}

const MatchConfirmation: React.FC<MatchConfirmationProps> = ({
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
}) => {
  return (
    <View style={styles.matchFoundContainer}>
      <Animated.Image
        source={{ uri: opponentProfileImage }}
        style={[styles.opponentProfileImage, animatedImageStyle]}
      />
      <Text style={styles.matchFoundText}>Avversario trovato: {opponentName}</Text>
      <View style={styles.passwordContainer}>
        <Text style={styles.matchFoundText}>Match Password:</Text>
        <View style={styles.passwordBox}>
          <Text style={[styles.passwordText, { color: theme.text }]}>{matchPassword}</Text>
        </View>
        <TouchableOpacity onPress={() => handleCopyToClipboard(matchPassword)} style={styles.copyButton}>
          <Copy color="#fff" size={20} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.centeredText, { color: theme.text }]}>chi ha vinto?</Text>
      <View style={styles.profileImagesContainer}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleUserImagePress}>
            <Image
              source={{ uri: userProfileImage }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          {userImageClicked && <Check color="green" size={24} />}
        </View>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleOpponentImagePress}>
            <Image
              source={{ uri: opponentProfileImage }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
          {opponentImageClicked && <Check color="green" size={24} />}
        </View>
      </View>
      {isConfirmButtonActive && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmWinner}>
          <Text style={styles.confirmButtonText}>Conferma Vincitore</Text>
        </TouchableOpacity>
      )}
      {winnerConfirmed && (
        <Text style={[styles.matchFoundText, { color: 'blue' }]}>Vincitore Confermato!</Text>
      )}
      {awaitingConfirmation && showTimer && (
        <View style={styles.awaitingConfirmationContainer}>
          <Text style={[styles.awaitingConfirmationText, { color: theme.text }]}>
            In attesa della conferma dell'avversario...
          </Text>
          <Text style={[styles.timerText, { color: theme.text }]}>
            Tempo rimanente: {timer} secondi
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  matchFoundContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  matchFoundText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745', // Verde per indicare successo
  },
  opponentProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  passwordBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
  },
  passwordText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  copyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  profileImagesContainer: {
    flexDirection: 'row', // Display images side by side
    justifyContent: 'center', // Center images horizontally
    marginTop: 10, // Add some space above the images
  },
  profileImage: {
    width: 50, // Adjust size as needed
    height: 50, // Adjust size asneeded
    borderRadius: 25, // Make images circular
    marginHorizontal: 10, // Add some horizontal spacing between images
  },
  imageContainer: {
    alignItems: 'center', // Center items horizontally
  },
  confirmButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  awaitingConfirmationContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  awaitingConfirmationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timerText: {
    fontSize: 16,
  },
});

export default MatchConfirmation;
