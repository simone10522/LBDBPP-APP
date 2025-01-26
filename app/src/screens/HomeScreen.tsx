import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimension } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from 'react-native-elements';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Errore durante il recupero dei tornei: ${error.message}`);
      }

      if (data) {
        setTournaments(data);
      } else {
        setTournaments([]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsername = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error("Error fetching user data:", error);
          setUsername('Guest');
        } else {
          setUsername(data?.username || 'Guest');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUsername('Guest');
      }
    } else {
      setUsername('Guest');
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchUsername();
  }, [user, fetchTournaments]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchTournaments().finally(() => setRefreshing(false));
  }, [fetchTournaments]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tornei</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateTournament')}>
              <Text style={styles.createButtonText}>Crea Torneo</Text>
            </TouchableOpacity>
            {!user && (
              <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginButtonText}>Accedi</Text>
              </TouchableOpacity>
            )}
            {user && (
              <Text style={styles.username}>Ciao! {username}</Text>
            )}
          </View>
        </View>
        {loading && <Text>Caricamento...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.tournamentsContainer}>
          {tournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              onPress={() => navigation.navigate('TournamentDetails', { id: tournament.id })}
            >
              <Card containerStyle={styles.card}>
                <View style={styles.cardHeader}>
                  <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png' }}
                    style={styles.cardIcon}
                  />
                  <Text style={[styles.cardStatus, {
                    backgroundColor: tournament.status === 'completed' ? 'green' : tournament.status === 'in_progress' ? 'yellow' : 'gray',
                  }]}>
                    {tournament.status.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{tournament.name}</Text>
                <Text style={styles.cardDescription}>{tournament.description}</Text>
                <Text style={styles.cardDate}>Created {new Date(tournament.created_at).toLocaleDateString()}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        {tournaments.length === 0 && !loading && (
          <View style={styles.noTournamentsContainer}>
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png' }}
              style={styles.noTournamentsIcon}
            />
            <Text style={styles.noTournamentsTitle}>Nessun Torneo Disponibile</Text>
            <Text style={styles.noTournamentsText}>Inizia creando un Torneo!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 0,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textShadowColor: 'black',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tournamentsContainer: {
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    width: Dimensions.get('window').width - 20,
    marginHorizontal: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  cardStatus: {
    padding: 5,
    borderRadius: 5,
    color: 'white',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  cardDate: {
    fontSize: 14,
    color: '#999',
  },
  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  noTournamentsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  noTournamentsIcon: {
    height: 60,
    width: 60,
    marginBottom: 10,
  },
  noTournamentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  noTournamentsText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;
