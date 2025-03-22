import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { Home, List, User, BarChart4, Repeat, MessageSquare } from 'lucide-react-native'; // Import MessageSquare for Chat icon

const BottomNavigationBar = () => {
  const navigation = useNavigation();
  const { user } = useAuth(); // Get the user from the auth context

  const handleProfilePress = () => {
    if (user) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
        <Home color="#fff" size={24} />
        <Text style={styles.buttonText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('TournamentPage')}>
        <List color="#fff" size={24} />
        <Text style={styles.buttonText}>Tornei</Text>
      </TouchableOpacity>
      {/* Rimosso temporaneamente il tasto Ranked */}
      {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('RankedScreen')}>
        <BarChart4 color="#fff" size={24} />
        <Text style={styles.buttonText}>Ranked</Text>
      </TouchableOpacity> */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChatListScreen')}>
        <MessageSquare color="#fff" size={24} />
        <Text style={styles.buttonText}>Chat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('TradeScreen')}>
        <Repeat color="#fff" size={24} />
        <Text style={styles.buttonText}>Trade</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleProfilePress}>
        <User color="#fff" size={24} />
        <Text style={styles.buttonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 5, // Modifica questo valore per cambiare l'altezza. Diminuisci per una barra più piccola, aumenta per una più grande.
  },
  button: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 10, // Modifica questo valore per cambiare la dimensione del testo. Diminuisci per testo più piccolo, aumenta per testo più grande.
    marginTop: 3, // Regola anche questo valore se necessario per allineare il testo con l'icona
  },
});

export default BottomNavigationBar;
