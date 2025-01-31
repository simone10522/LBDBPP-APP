import React, { useState, useEffect } from 'react';
    import { View, Text, StyleSheet, ScrollView } from 'react-native';
    import { useRoute } from '@react-navigation/native';
    import { supabase } from '../lib/supabase';

    interface Participant {
      username: string;
      points: number;
    }

    const LeaderboardScreen = () => {
      const route = useRoute();
      const { tournamentId } = route.params as { tournamentId: string };
      const [participants, setParticipants] = useState<Participant[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        const fetchParticipants = async () => {
          setLoading(true);
          try {
            const { data, error } = await supabase
              .from('tournament_participants')
              .select(`
                username:participant_id ( username ),
                points
              `)
              .eq('tournament_id', tournamentId)
              .order('points', { ascending: false });

            if (error) throw error;

            if (data) {
              setParticipants(data.map((p) => ({
                username: p.username.username,
                points: p.points,
              })));
            }
          } catch (error: any) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        };

        fetchParticipants();
      }, [tournamentId]);

      if (loading) {
        return <View style={styles.container}><Text>Loading...</Text></View>;
      }

      if (error) {
        return <View style={styles.container}><Text style={styles.error}>Error: {error}</Text></View>;
      }

      return (
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Leaderboard</Text>
          {participants.length > 0 ? (
            <View style={styles.listContainer}>
              {participants.map((participant, index) => (
                <View key={index} style={styles.participantItem}>
                  <Text style={styles.rank}>{index + 1}.</Text>
                  <Text style={styles.participantName}>{participant.username}</Text>
                  <Text style={styles.points}>{participant.points} Points</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>No participants found.</Text>
          )}
        </ScrollView>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f0f0f0',
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
      },
      listContainer: {
        width: '100%',
      },
      participantItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 10,
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
      },
      rank: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        marginRight: 10,
      },
      participantName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
      },
      points: {
        fontSize: 16,
        color: '#333',
      },
      error: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
      },
      noData: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
      },
    });

    export default LeaderboardScreen;
