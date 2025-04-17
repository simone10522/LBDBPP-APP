import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';

interface Match {
  id: string;
  round: number;
  player1: string;
  player2: string;
  winner_id: string | null;
  player1_win: number;
  player2_win: number;
}

const BracketScreen: React.FC = () => {
  const { id } = useRoute().params as { id: string };
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            round,
            winner_id,
            player1_win,
            player2_win,
            player1:player1_id(username),
            player2:player2_id(username)
          `)
          .eq('tournament_id', id)
          .order('round', { ascending: true });

        if (error) throw error;

        setMatches(data.map(m => ({
          ...m,
          player1: m.player1.username,
          player2: m.player2.username
        })));
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [id]);

  const renderMatch = (match: Match, roundIndex: number) => (
    <View 
      key={match.id} 
      style={[
        styles.matchContainer, 
        { 
          backgroundColor: theme.cardBackground,
          marginLeft: roundIndex * 20 // Indent each round
        }
      ]}
    >
      <View style={styles.playerPair}>
        <Text style={[styles.playerName, { 
          color: theme.text,
          fontWeight: match.winner_id === match.player1 ? 'bold' : 'normal',
          backgroundColor: match.winner_id === match.player1 ? theme.buttonBackground : 'transparent',
          padding: 8,
          borderRadius: 4
        }]}>
          {match.player1} {match.player1_win > 0 && `(${match.player1_win})`}
        </Text>
        <View style={styles.separator} />
        <Text style={[styles.playerName, { 
          color: theme.text,
          fontWeight: match.winner_id === match.player2 ? 'bold' : 'normal',
          backgroundColor: match.winner_id === match.player2 ? theme.buttonBackground : 'transparent',
          padding: 8,
          borderRadius: 4
        }]}>
          {match.player2} {match.player2_win > 0 && `(${match.player2_win})`}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading bracket...</Text>
      </View>
    );
  }

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      horizontal={true}
    >
      <View style={styles.bracketContainer}>
        {rounds.map((round, index) => {
          const roundMatches = matches.filter(m => m.round === round);
          return (
            <View key={round} style={styles.roundColumn}>
              <Text style={[styles.roundTitle, { color: theme.text }]}>
                {round === rounds.length ? 'Finals' : 
                 round === rounds.length - 1 ? 'Semi-Finals' : 
                 round === rounds.length - 2 ? 'Quarter-Finals' : 
                 `Round ${round}`}
              </Text>
              {roundMatches.map(match => renderMatch(match, index))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  bracketContainer: {
    flexDirection: 'row',
    padding: 10,
  },
  roundColumn: {
    marginRight: 20,
    minWidth: 280,
  },
  playerPair: {
    padding: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 8,
  },
});

export default BracketScreen;
