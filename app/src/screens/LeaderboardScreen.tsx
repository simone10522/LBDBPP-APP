import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/_useAuth';
import { FontAwesome } from '@expo/vector-icons';

interface TournamentParticipant {
  id: string;
  username: string;
  matches_won: number;
  matches_lost: number;
  participant_id: string;
  points: number;
}

const LeaderboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: string };
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      return <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{index + 1}</Text>;
    }
  };

  const darkPalette = {
    background: '#121212',
    text: '#FFFFFF',
    secondaryText: '#AAAAAA',
    headerBackground: '#1E1E1E',
    rowBackground: '#2C2C2C',
    currentUserRow: '#333333',
    borderColor: '#373737',
  };


  if (loading) {
    return <View style={styles.container}><Text style={{ color: darkPalette.text }}>Caricamento...</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: darkPalette.background }]}>
      <Text style={[styles.title, { color: darkPalette.text }]}>Leaderboard</Text>
      <View style={[styles.headerRow, { borderBottomColor: darkPalette.borderColor }]}>
        <Text style={[styles.headerCell, { flex: 1, textAlign: 'center', color: darkPalette.text }]}>Pos</Text>
        <Text style={[styles.headerCell, { flex: 2, textAlign: 'center', color: darkPalette.text }]}>Player</Text>
        <Text style={[styles.headerCell, { color: darkPalette.text }]}>P</Text>
        <Text style={[styles.headerCell, { color: darkPalette.text }]}>W</Text>
        <Text style={[styles.headerCell, { color: darkPalette.text }]}>L</Text>
      </View>
      {sortedParticipants.map((participant, index) => (
        <View key={participant.id} style={[styles.row, user?.id === participant.participant_id ? styles.currentUserRow : {},
        { backgroundColor: user?.id === participant.participant_id ? darkPalette.currentUserRow : darkPalette.rowBackground,
        borderBottomColor: darkPalette.borderColor }]}>
          <Text style={[styles.cell, { flex: 1, textAlign: 'center', color: darkPalette.text }]}>
            {index < 3 ? renderRankingIndicator(index) : index + 1}
          </Text>
          <Text style={[styles.cell, { flex: 2, textAlign: 'center', color: darkPalette.text }]}>{participant.username}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: darkPalette.text }]}>{participant.points}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: darkPalette.text }]}>{participant.matches_won || 0}</Text>
          <Text style={[styles.cell, { textAlign: 'center', color: darkPalette.text }]}>{participant.matches_lost || 0}</Text>
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
  currentUserRow: {
  },
});

export default LeaderboardScreen;
