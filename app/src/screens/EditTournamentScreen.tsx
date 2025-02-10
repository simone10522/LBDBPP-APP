import React, { useState, useEffect } from 'react';
    import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
    import { useNavigation, useRoute } from '@react-navigation/native';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/_useAuth';

    export default function EditTournamentScreen() {
      const { user } = useAuth();
      const navigation = useNavigation();
      const route = useRoute();
      const { id } = route.params as { id: string };
      const [name, setName] = useState('');
      const [description, setDescription] = useState('');
      const [startDate, setStartDate] = useState('');
      const [maxPlayers, setMaxPlayers] = useState('');
      const [maxRounds, setMaxRounds] = useState('');
      const [bestOf, setBestOf] = useState<number | null>(null);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const fetchTournament = async () => {
          if (!id) return;
          try {
            setLoading(true);
            const { data, error } = await supabase
              .from('tournaments')
              .select('*')
              .eq('id', id)
              .single();
            if (error) throw error;
            setName(data.name);
            setDescription(data.description || '');
            setStartDate(data.start_date ? data.start_date.slice(0, 10) : '');
            setMaxPlayers(data.max_players === null ? '' : String(data.max_players));
            setMaxRounds(data.max_rounds === null ? '' : String(data.max_rounds));
            setBestOf(data.best_of || null);
          } catch (error: any) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        };
        fetchTournament();
      }, [id]);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const maxPlayersValue = maxPlayers === '' ? null : parseInt(maxPlayers, 10);
          if (maxPlayersValue !== null && isNaN(maxPlayersValue)) {
            throw new Error("Numero massimo di giocatori non valido.");
          }
          const maxRoundsValue = maxRounds === '' ? null : parseInt(maxRounds, 10);
          if (maxRoundsValue !== null && isNaN(maxRoundsValue)) {
            throw new Error("Numero massimo di turni non valido.");
          }
          if (bestOf === null) {
            throw new Error("Seleziona un'opzione per Best of.");
          }
          const { error } = await supabase
            .from('tournaments')
            .update({ name, description, start_date: startDate, max_players: maxPlayersValue, max_rounds: maxRoundsValue, best_of: bestOf })
            .eq('id', id);
          if (error) throw error;
          navigation.navigate('TournamentDetails', { id: id, refresh: true });
        } catch (error: any) {
          setError(error.message);
          Alert.alert('Errore', error.message);
        }
      };

      if (loading) {
        return <View style={styles.container}><Text>Caricamento...</Text></View>;
      }

      return (
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Edit Tournament</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Tournament Name</Text>
            <TextInput
              style={styles.input}
              type="text"
              value={name}
              onChangeText={setName}
              required
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              type="date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              required
            />

            <Text style={styles.label}>Max Players</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              placeholder="Unlimited"
            />
            <Text style={styles.label}>Max Rounds</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={maxRounds}
              onChangeText={setMaxRounds}
              placeholder="Unlimited"
            />

            <Text style={styles.label}>Best of</Text>
            <View style={styles.bestOfContainer}>
              <TouchableOpacity
                style={[styles.button, bestOf === 3 && styles.selectedButton]}
                onPress={() => setBestOf(3)}
              >
                <Text style={[styles.buttonText, bestOf === 3 && styles.selectedButtonText]}>Best of 3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, bestOf === 5 && styles.selectedButton]}
                onPress={() => setBestOf(5)}
              >
                <Text style={[styles.buttonText, bestOf === 5 && styles.selectedButtonText]}>Best of 5</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>Aggiorna Torneo</Text>
            </TouchableOpacity>
          </View>
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
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
        textAlign: 'center',
      },
      form: {
        width: '100%',
      },
      label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
      },
      input: {
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
      },
      selectButton: {
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
      },
      selectButtonText: {
        color: '#333',
      },
      button: {
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      errorContainer: {
        backgroundColor: '#f8d7da',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f5c6cb',
      },
      error: {
        color: '#721c24',
        fontSize: 16,
        textAlign: 'center',
      },
      bestOfContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
      },
      selectedButton: {
        backgroundColor: '#3498db',
      },
      selectedButtonText: {
        color: 'white',
      },
    });
