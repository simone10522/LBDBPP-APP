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
  useAuth.getState().setLoading(true);

  if (session) {
    useAuth.getState().setUser(session.user);
    try {
      await AsyncStorage.setItem('supabase.auth.session', JSON.stringify(session));
    } catch (error) {
      console.error("Error saving session:", error);
    }
  } else {
    useAuth.getState().setUser(null);
    try {
      await AsyncStorage.removeItem('supabase.auth.session');
    } catch (error) {
      console.error("Error removing session:", error);
    }
  }
  useAuth.getState().setLoading(false);
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
      // Ignoriamo silenziosamente l'errore PGRST116
      if (error.message.includes('PGRST116')) {
        console.log('Profile not found yet, this is normal after registration');
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    return null;
  }
};
