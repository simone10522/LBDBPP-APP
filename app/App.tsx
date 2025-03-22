import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet, SafeAreaView, LogBox, Alert, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TournamentDetailsScreen from './src/screens/TournamentDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ManageParticipantsScreen from './src/screens/ManageParticipantsScreen';
import ManageDecksScreen from './src/screens/ManageDecksScreen';
import CreateTournamentScreen from './src/screens/CreateTournamentScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavigationBar from './src/components/BottomNavigationBar';
import TournamentPage from './src/screens/TournamentPage';
import RankedScreen from './src/screens/RankedScreen';
import MyDecksScreen from './src/screens/MyDecksScreen';
import Decklistscreen from './src/screens/Decklistscreen';
import TradeScreen from './src/screens/TradeScreen';
import TradeCompletedAnimation from './src/components/TradeCompletedAnimation';
import ChatScreen from './src/screens/ChatScreen';
import ChatListScreen from './src/screens/ChatListScreen';
// Utils
import { useAuth, useOnlineStatus } from './src/hooks/useAuth';
import { supabase } from './src/lib/supabase';

const Stack = createNativeStackNavigator();

const App = () => {
  const { userId, user } = useAuth();

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    }
  }

  const getToken = async () => {
    try {
      const token = await messaging().getToken();
      console.log("Token = ", token);
      if (user) {
        await updatePushToken(token, user.id);
      }
    } catch (error) {
      console.error("Error getting or updating token:", error);
    }
  };

  const updatePushToken = async (token: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        console.error("Error updating push token:", error);
      } else {
        console.log("Push token updated successfully");
      }
    } catch (error) {
      console.error("Error updating push token:", error);
    }
  };

  useEffect(() => {
    requestUserPermission();
    getToken();

    // Listen for incoming messages when the app is in the foreground
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
      );
      console.log('Message handled in the foreground!', remoteMessage);
    });

    return unsubscribe;
  }, [user]);

  useOnlineStatus();
  LogBox.ignoreLogs(['Setting a timer']);

  useEffect(() => {}, [userId]);

  return (
    <NavigationContainer>
      <View style={styles.background}>
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Navigator
            initialRouteName="Home"
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
              headerShown: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ManageParticipants" component={ManageParticipantsScreen} />
            <Stack.Screen name="ManageDecks" component={ManageDecksScreen} />
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="TournamentPage" component={TournamentPage} />
            <Stack.Screen name="RankedScreen" component={RankedScreen} />
            <Stack.Screen name="MyDecks" component={MyDecksScreen} />
            <Stack.Screen name="Decklistscreen" component={Decklistscreen} />
            <Stack.Screen name="TradeScreen" component={TradeScreen} />
            <Stack.Screen name="TradeCompletedAnimation" component={TradeCompletedAnimation} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
          </Stack.Navigator>
        </SafeAreaView>
        <BottomNavigationBar />
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#222',
  },
});

export default App;
