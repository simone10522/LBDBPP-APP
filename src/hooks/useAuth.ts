import { create } from 'zustand';
    import { supabase } from '../lib/supabase';

    interface AuthState {
      user: any | null;
      setUser: (user: any | null) => void;
    }

    export const useAuth = create<AuthState>((set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }));

    // Initialize auth state
    supabase.auth.onAuthStateChange((event, session) => {
      useAuth.getState().setUser(session?.user ?? null);
    });
