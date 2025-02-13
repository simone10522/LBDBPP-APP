import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
// Import Constants from expo-constants
import Constants from 'expo-constants';

interface AuthState {
  user: any | null;
  setUser: (user: any | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));

async function registerForPushNotificationsAsync() {
  console.log("registerForPushNotificationsAsync: Starting push token registration");
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas.projectId,
    });
    console.log("registerForPushNotificationsAsync: Push token received:", token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token?.data;
}


// Initialize auth state and handle push token
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("onAuthStateChange: Starting auth state change process");
  useAuth.getState().setLoading(true);
  if (session) {
    useAuth.getState().setUser(session.user);
    try {
      await AsyncStorage.setItem('supabase.auth.session', JSON.stringify(session));
      console.log("onAuthStateChange: Session saved to AsyncStorage");
    } catch (error) {
      console.error("onAuthStateChange: Error saving session:", error);
    }

    // Push notification logic (re-introduced with logging and error handling)
    try {
      console.log("onAuthStateChange: Attempting to register for push notifications");
      const pushToken = await registerForPushNotificationsAsync();
      console.log("onAuthStateChange: Push token registration result:", pushToken);

      if (pushToken) {
        console.log("onAuthStateChange: Attempting to update profile with push token");
        console.log("onAuthStateChange: About to call supabase update...");
        supabase
          .from('profiles')
          .update({ push_token: pushToken })
          .eq('id', session.user.id)
          .then((response) => {
            if (response.error) {
              console.error("onAuthStateChange: Error updating profile with push token (in then block):", response.error);
              console.log("onAuthStateChange: Profile update failed in then block"); // Explicit error log
            } else {
              console.log("onAuthStateChange: Profile updated successfully with push token (in then block):", response.data);
              console.log("onAuthStateChange: Profile update successful in then block"); // Explicit success log
            }
          })
          .catch(error => {
            console.error("onAuthStateChange: Error updating profile with push token (in catch block):", error);
            console.log("onAuthStateChange: Profile update failed in catch block"); // Explicit error log
          });
      }
    } catch (notificationError) {
      console.error("onAuthStateChange: Error during push notification registration/update:", notificationError);
    }


  } else {
    console.log("onAuthStateChange: User logged out - Attempting to remove push token"); // Log for logout start
    const previousUser = useAuth.getState().user; // Get the current user before setting to null
    console.log("onAuthStateChange: Previous user before logout:", previousUser); // Log previous user info
    if (previousUser) {
      console.log("onAuthStateChange: Previous user exists, proceeding with push token removal"); // Log if previous user exists
      supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', previousUser.id)
        .then(response => {
          if (response.error) {
            console.error("onAuthStateChange: Error removing push token on logout:", response.error);
            console.log("onAuthStateChange: Push token removal failed - error response"); // Log error response
          } else {
            console.log("onAuthStateChange: Push token removed from profile on logout - success");
            console.log("onAuthStateChange: Push token removal successful:", response.data); // Log success response
          }
        })
        .catch(error => {
          console.error("onAuthStateChange: Error removing push token on logout (catch block):", error);
          console.log("onAuthStateChange: Push token removal failed - catch block error"); // Log catch block error
        });
    } else {
      console.log("onAuthStateChange: No previous user found on logout, skipping push token removal"); // Log if no previous user
    }
    useAuth.getState().setUser(null);
    try {
      await AsyncStorage.removeItem('supabase.auth.session');
      console.log("onAuthStateChange: Session removed from AsyncStorage (logout)");
    } catch (error) {
      console.error("onAuthStateChange: Error removing session:", error);
    }
  }
  useAuth.getState().setLoading(false);
  console.log("onAuthStateChange: Auth state change process completed"); // Log at the end of the function
});

const loadSession = async () => {
  try {
    const session = await AsyncStorage.getItem('supabase.auth.session');
    if (session) {
      const parsedSession = JSON.parse(session);
      const { data, error } = await supabase.auth.setSession(parsedSession);
      if (error) {
        console.error("loadSession: Error loading session:", error);
      } else {
        useAuth.getState().setUser(data.user);
        console.log("loadSession: Session loaded successfully from AsyncStorage");
      }
    }
  } catch (error) {
    console.error("loadSession: Error retrieving session from AsyncStorage:", error);
  } finally {
    useAuth.getState().setLoading(false);
  }
};

loadSession();
