import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import TournamentDetailsScreen from './src/screens/TournamentDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ManageParticipantsScreen from './src/screens/ManageParticipantsScreen';
import ManageDecksScreen from './src/screens/ManageDecksScreen';
import CreateTournamentScreen from './src/screens/CreateTournamentScreen';
import { Platform, View, ImageBackground, StyleSheet, SafeAreaView } from 'react-native';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <ImageBackground
        source={{ uri: 'https://epicscifiart.wordpress.com/wp-content/uploads/2015/10/all-151-original-pokemon-battling-in-poster-art.jpg' }}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.2, backgroundColor: 'black' }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Navigator
            screenOptions={{
              headerTitleStyle: {
                fontSize: 20,
                fontWeight: 'bold',
              },
              headerStyle: {
                backgroundColor: 'transparent',
                paddingTop: Platform.OS === 'android' ? 25 : 0,
              },
              headerTintColor: '#fff',
              headerTitleAlign: 'center',
              headerShadowVisible: false,
              headerTransparent: Platform.OS === 'android',
              animation: 'none',
              headerShown: false,
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ManageParticipants" component={ManageParticipantsScreen} />
            <Stack.Screen name="ManageDecks" component={ManageDecksScreen} />
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
          </Stack.Navigator>
        </SafeAreaView>
      </ImageBackground>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default App;
