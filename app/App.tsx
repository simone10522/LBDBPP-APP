import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, StyleSheet, SafeAreaView, LogBox, Alert, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import MobileAds from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TournamentDetailsScreen from './src/screens/TournamentDetailsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ManageParticipantsScreen from './src/screens/ManageParticipantsScreen';
//import ManageDecksScreen from './src/screens/ManageDecksScreen';
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
import TournamentDeckScreen from './src/screens/TournamentDeckScreen';
import ThreeDCube from './src/screens/3dcube';
import BracketScreen from './src/screens/BracketScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import PackToPullScreen from './src/screens/packtopull/packtopull';
import CalculatePullScreen from './src/screens/packtopull/calculatepull';
import LoadingScreen from './src/screens/LoadingScreen';
// Utils
import { useAuth, useOnlineStatus } from './src/hooks/useAuth';
import { supabase } from './src/lib/supabase';

const Stack = createNativeStackNavigator();

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: 'green', backgroundColor: '#222', marginTop: 0 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, color: '#fff' }}
      text2Style={{ fontSize: 13, color: '#ddd' }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: 'red', backgroundColor: '#222', marginTop: 20 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, color: '#fff' }}
      text2Style={{ fontSize: 13, color: '#ddd' }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#007AFF', backgroundColor: '#222', marginTop: 20 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, color: '#fff' }}
      text2Style={{ fontSize: 13, color: '#ddd' }}
    />
  ),
};

const App = () => {
  const { userId, user, initializeAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Authorization status enabled
    }
  }

  const getToken = async () => {
    try {
      const token = await messaging().getToken();
      if (user) {
        await updatePushToken(token, user.id);
      }
    } catch (error) {
      // Error getting or updating token
    }
  };

  const updatePushToken = async (token: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        // Error updating push token
      }
    } catch (error) {
      // Error updating push token
    }
  };

  // Mostra richiesta notifiche solo al primo avvio
  useEffect(() => {
    async function checkNotificationPrompt() {
      try {
        const alreadyAsked = await AsyncStorage.getItem('notificationPromptAsked');
        if (!alreadyAsked) {
          Alert.alert(
            'Abilita notifiche?',
            'Vuoi ricevere notifiche push per aggiornamenti e messaggi importanti?',
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: async () => {
                  await AsyncStorage.setItem('notificationPromptAsked', 'true');
                },
              },
              {
                text: 'Sì',
                onPress: async () => {
                  await requestUserPermission();
                  await getToken();
                  await AsyncStorage.setItem('notificationPromptAsked', 'true');
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          // Se già chiesto, puoi opzionalmente richiedere permessi se non già dati
          // oppure non fare nulla
        }
      } catch (error) {
        // Gestisci eventuali errori di AsyncStorage
      }
    }
    checkNotificationPrompt();
  }, [user]);

  useEffect(() => {
    async function testAsyncStorage() {
      try {
        await AsyncStorage.setItem('testKey', 'testValue');
        const value = await AsyncStorage.getItem('testKey');
        console.log("Valore recuperato da AsyncStorage:", value); // Dovrebbe stampare "testValue"
      } catch (error) {
        console.error("Errore con AsyncStorage:", error);
      }
    }
    testAsyncStorage();
  }, []);

  useOnlineStatus();
  LogBox.ignoreLogs(['Setting a timer']);

  useEffect(() => {
    async function initApp() {
      await initializeAuth(); // Ripristina la sessione salvata

      // Recupera manualmente la sessione e loggala
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Errore nel recupero della sessione:", error);
      } else if (session) {
        console.log("Auth state changed: SIGNED_IN", session); // Forza il log
        useAuth.getState().setUser(session.user);
      } else {
        console.log("Nessuna sessione attiva trovata. Verifica i token salvati.");
      }
      setIsLoading(false); // <-- Loading finito
    }

    initApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session); // Questo genera il log durante i cambiamenti di stato
      if (session) {
        useAuth.getState().setUser(session.user);
      } else {
        useAuth.getState().setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
      );
    });

    return unsubscribe;
  }, [user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <NavigationContainer>
        <View style={styles.background}>
          {/* SafeAreaView deve essere fuori dal Navigator */}
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
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ManageParticipants" component={ManageParticipantsScreen} />
              <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="TournamentPage" component={TournamentPage} />
              <Stack.Screen name="RankedScreen" component={RankedScreen} />
              <Stack.Screen name="MyDecks" component={MyDecksScreen} />
              <Stack.Screen name="Decklistscreen" component={Decklistscreen} options={{ title: 'Deck List' }} />
              <Stack.Screen name="TradeScreen" component={TradeScreen} />
              <Stack.Screen name="TradeCompletedAnimation" component={TradeCompletedAnimation} />
              <Stack.Screen name="ChatScreen" component={ChatScreen} />
              <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
              <Stack.Screen name="TournamentDeckScreen" component={TournamentDeckScreen}/>
              <Stack.Screen name="ThreeDCube" component={ThreeDCube} options={{ title: '3D Cube' }} />
              <Stack.Screen name="Bracket" component={BracketScreen} />
              <Stack.Screen name="PackToPull" component={PackToPullScreen} options={{ title: 'My Cards' }} />
              <Stack.Screen name="CalculatePull" component={CalculatePullScreen} options={{ title: 'Calculate Pull' }} />
            </Stack.Navigator>
          </SafeAreaView>
          <BottomNavigationBar />
        </View>
      </NavigationContainer>
      <Toast config={toastConfig} />
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#222',
  },
});

export default App;
