import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import TournamentList from '../components/TournamentList';
import { useAuth } from '../hooks/useAuth'; // Import useAuth hook
import { lightPalette, darkPalette } from '../context/themes'; // Import lightPalette and darkPalette

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_by: string;
  max_players: number | null;
}

const TournamentPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [isCardMinimized, setIsCardMinimized] = useState(false);
  const { isDarkMode } = useAuth(); // Use useAuth hook to get isDarkMode

  const theme = isDarkMode ? darkPalette : lightPalette; // Determine current theme

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, profiles!tournaments_created_by_fkey(username)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const tournamentsWithUsername = data.map((tournament: any) => ({
          ...tournament,
          created_by: tournament.profiles?.username || 'Unknown',
        }));
        setAllTournaments(tournamentsWithUsername);
        filterTournaments(tournamentsWithUsername, searchTerm);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const filterTournaments = (tournamentsToFilter: Tournament[], term: string) => {
    const filtered = term
      ? tournamentsToFilter.filter(
          (tournament) =>
            tournament.name.toLowerCase().includes(term.toLowerCase()) ||
            tournament.description.toLowerCase().includes(term.toLowerCase())
        )
      : tournamentsToFilter;
    setTournaments(filtered);
  };

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTournaments().finally(() => setRefreshing(false));
  }, [fetchTournaments]);

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterTournaments(allTournaments, text);
  };

  const toggleCardSize = () => {
    setIsCardMinimized(!isCardMinimized);
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />}
      >
        <TournamentList
          tournaments={tournaments}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          searchTerm={searchTerm}
          handleSearchChange={handleSearchChange}
          isCardMinimized={isCardMinimized}
          toggleCardSize={toggleCardSize}
        />
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
});

export default TournamentPage;
