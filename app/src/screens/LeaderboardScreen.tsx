import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { FontAwesome } from '@expo/vector-icons';
import { lightPalette, darkPalette } from '../context/themes'; // Importa i temi

interface TournamentParticipant {
  id: string;
  username: string;
  matches_won: number;
  matches_lost: number;
  participant_id: string;
  points: number;
}

const LeaderboardScreen = () => {
  const { user, isDarkMode } = useAuth(); // Usa isDarkMode dal contesto
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: string };
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = isDarkMode ? darkPalette : lightPalette; // Determina il tema corrente


  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          matches_won,
          matches_lost,
          participant_id,
          points,
          profiles:participant_id (username)
        `)
        .eq('tournament_id', id);

      if (error) {
        throw new Error(`Errore durante il recupero della classifica: ${error.message}`);
      }

      if (data) {
        setParticipants(
          data.map((p) => ({
            id: p.id,
            username: p.profiles.username,
            matches_won: p.matches_won || 0,
            matches_lost: p.matches_lost || 0,
            participant_id: p.participant_id,
            points: p.points || 0, // Access points directly from tournament_participants
          }))
        );
      } else {
        setParticipants([]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.matches_won - a.matches_won;
  });

  const renderRankingIndicator = (index: number) => {
    if (index === 0) {
      return <FontAwesome name="trophy" size={20} color="gold" />;
    } else if (index === 1) {
      return <FontAwesome name="trophy" size={20} color="silver" />;
    } else if (index === 2) {
      return <FontAwesome name="trophy" size={20} color="#CD7F32" />;
    } else {
      return <Text style={[styles.cell, { flex: 1, textAlign: 'center', color: theme.text }]}>{index + 1}</Text>;
    }
  };


  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>Caricamento...</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Leaderboard</Text>
      <View style={[styles.headerRow, { borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.headerCell, { flex: 1, textAlign: 'center', color: theme.text }]}>Pos</Text>
        <Text style={[styles.headerCell, { flex: 2, textAlign: 'center', color: theme.text }]}>Player</Text>
        <Text style={[styles.headerCell, { color: theme.text }]}>P</Text>
        <Text style={[styles.headerCell, { color: theme.text }]}>W</Text>
        <Text style={[styles.headerCell, { color: theme.text }]}>L</Text>
      </View>
      {sortedParticipants.map((participant, index) => (
        <View key={participant.id} style={[styles.row, user?.id === participant.participant_id ? styles.currentUserRow : {},
        { backgroundColor: user?.id === participant.participant_id ? theme.currentUserRow : theme.rowBackground, // Usa variabili tema
        borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.cell, { flex: 1, textAlign: 'center', color: theme.text }]}>
            {index < 3 ? renderRankingIndicator(index) : index + 1}
          </Text>
          <Text style={[styles.cell, { flex: 2, textAlign: 'center', color: theme.text }]}>{participant.username}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: theme.text }]}>{participant.points}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: theme.text }]}>{participant.matches_won || 0}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: theme.text }]}>{participant.matches_lost || 0}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  currentUserRow: { // Stile per la riga dell'utente corrente - da definire nel tema se necessario
    backgroundColor: '#333333', // Esempio di colore tema scuro, da spostare in darkPalette se necessario
  },
  rowBackground: { // Stile per lo sfondo della riga - da definire nel tema
    backgroundColor: '#2C2C2C', // Esempio di colore tema scuro, da spostare in darkPalette se necessario
  },
});

export default LeaderboardScreen;
