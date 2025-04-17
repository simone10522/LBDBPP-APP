import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useRef } from 'react';

interface AuthState {
  user: any | null;
  setUser: (user: any | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDarkMode: boolean) => void;
  userId: string | null;
  initializeAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        set({ user, userId: user ? user.id : null });
      },
      loading: true,
      setLoading: (loading) => {
        set({ loading });
      },
      isDarkMode: true,
      setIsDarkMode: (isDarkMode: boolean) => set({ isDarkMode }),
      userId: null,
      initializeAuth: async () => {
        try {
          console.log('Starting auth initialization...');
          // First check if we have a persisted session
          const persistedSession = await AsyncStorage.getItem('app-session');
          console.log('Checking persisted session:', persistedSession ? 'Found' : 'Not found');

          if (persistedSession) {
            const sessionData = JSON.parse(persistedSession);
            console.log('Attempting to restore session...');
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token,
            });

            if (session) {
              console.log('Successfully restored session from storage', session.user.id);
              set({ user: session.user, userId: session.user.id, loading: false });
              return;
            }
          }

          // If no persisted session, try getting current session
          console.log('Checking current session...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('Found existing Supabase session', session.user.id);
            set({ user: session.user, userId: session.user.id, loading: false });
            
            // Save the session for future use
            await AsyncStorage.setItem('app-session', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            }));
          } else {
            console.log('No session found, setting loading to false');
            set({ loading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

const updateUserStatus = async (userId: string, status: 'online' | 'offline') => {
  if (userId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) {
        console.error("Error updating user status:", error);
      } else {
        console.log(`User status updated to ${status}`);
      }
    } catch (err) {
      console.error("Exception during status update:", err);
    }
  }
};

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("Auth state changed:", event, session ? "with session" : "no session");
  
  if (event === 'INITIAL_SESSION') {
    console.log("Initial session event, maintaining current state");
    return;
  }

  if (session) {
    try {
      await AsyncStorage.setItem('app-session', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      }));
      useAuth.getState().setUser(session.user);
      console.log("Session saved successfully");
    } catch (error) {
      console.error("Error saving session:", error);
    }
  } else if (event === 'SIGNED_OUT') {
    await AsyncStorage.removeItem('app-session');
    useAuth.getState().setUser(null);
    console.log("Session cleared due to sign out");
  }
});

// Custom hook to manage online status
export const useOnlineStatus = () => {
  const userId = useAuth((state) => state.userId);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userId) {
      // Update status to online when the component mounts (app opens)
      updateUserStatus(userId, 'online');

      // Set up the 5-minute ping
      intervalRef.current = setInterval(() => {
        updateUserStatus(userId, 'online');
      }, 300000); // 5 minutes = 300000 milliseconds

      // Add AppState change listener
      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === 'active') {
          updateUserStatus(userId, 'online');
          // Reset the interval when app becomes active
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            updateUserStatus(userId, 'online');
          }, 300000);
        } else {
          updateUserStatus(userId, 'offline');
          // Clear the interval when app goes to background or closes
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      };

      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

      // Cleanup function
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        appStateSubscription.remove();
        // Update status to offline when the component unmounts (app closes)
        updateUserStatus(userId, 'offline');
      };
    }
  }, [userId]);
};

export const fetchUserData = async (userId: string) => {
  try {
    // Aggiungiamo un delay di 3 secondi prima di fetchare i dati
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Ignora silenziosamente l'errore PGRST116
      if (error.code === 'PGRST116') {
        console.log('Profile not found yet, this is normal after registration');
        return null;
      }
      console.error('Error in fetchUserData:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return null;
  }
};

