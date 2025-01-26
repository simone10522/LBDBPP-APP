import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize auth state
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

const loadSession = async () => {
  try {
    const session = await AsyncStorage.getItem('supabase.auth.session');
    if (session) {
      const parsedSession = JSON.parse(session);
      const { data, error } = await supabase.auth.setSession(parsedSession);
      if (error) {
        console.error("Error loading session:", error);
      } else {
        useAuth.getState().setUser(data.user);
      }
    }
  } catch (error) {
    console.error("Error loading session:", error);
  } finally {
    useAuth.getState().setLoading(false);
  }
};

loadSession();
