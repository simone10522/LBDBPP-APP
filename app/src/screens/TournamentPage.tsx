import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import TournamentList from '../components/TournamentList';

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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
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
const darkPalette = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  text: '#FFFFFF',
  secondaryText: '#AAAAAA',
  accent: '#BB86FC',
  button: '#3700B3', // Default button color, will be overridden
  buttonText: '#FFFFFF',
  inputBackground: '#2C2C2C',
  inputPlaceholder: '#AAAAAA',
  statusCompleted: '#2ecc71',
  statusInProgress: '#e67e22',
  statusDraft: '#7f8c8d',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkPalette.background,
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
});

export default TournamentPage;
