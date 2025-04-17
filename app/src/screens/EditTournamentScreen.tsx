import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';

export default function EditTournamentScreen() {
  const { user, isDarkMode } = useAuth();
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [mandatoryDecks, setMandatoryDecks] = useState(false);
  const [password, setPassword] = useState('');

  const theme = isDarkMode ? darkPalette : lightPalette;

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
        setIsPrivate(data.private || false);
        setMandatoryDecks(data.mandatory_decks || false);
        setPassword(data.password || '');
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

      if (isPrivate && password.length === 0) {
        throw new Error("Inserisci una password per il torneo privato.");
      }

      const { error } = await supabase
        .from('tournaments')
        .update({ 
          name, 
          description, 
          start_date: startDate, 
          max_players: maxPlayersValue, 
          max_rounds: maxRoundsValue, 
          best_of: bestOf,
          private: isPrivate,
          password: isPrivate ? password : null,
          mandatory_decks: mandatoryDecks,
        })
        .eq('id', id);
      if (error) throw error;
      navigation.navigate('TournamentDetails', { id: id, refresh: true });
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Errore', error.message);
    }
  };

  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>Caricamento...</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Edit Tournament</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Tournament Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          value={name}
          onChangeText={setName}
          required
        />

        <Text style={[styles.label, { color: theme.text }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={[styles.label, { color: theme.text }]}>Start Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          required
        />

        <Text style={[styles.label, { color: theme.text }]}>Max Players</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          keyboardType="number-pad"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="Unlimited"
        />

        <Text style={[styles.label, { color: theme.text }]}>Max Rounds</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          keyboardType="number-pad"
          value={maxRounds}
          onChangeText={setMaxRounds}
          placeholder="Unlimited"
        />

        <Text style={[styles.label, { color: theme.text }]}>Best of</Text>
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

        {/* Private Tournament Section */}
        <View style={styles.toggleContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Private</Text>
          <Switch
            trackColor={{ false: theme.inputBackground, true: theme.buttonBackground }}
            thumbColor={isPrivate ? theme.buttonText : theme.text}
            onValueChange={setIsPrivate}
            value={isPrivate}
          />
        </View>

        {isPrivate && (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              placeholder="Enter password"
              placeholderTextColor="#aaa"
            />
          </>
        )}

        {/* Mandatory Decks Section */}
        <View style={styles.toggleContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Mandatory Decks</Text>
          <Switch
            trackColor={{ false: theme.inputBackground, true: theme.buttonBackground }}
            thumbColor={mandatoryDecks ? theme.buttonText : theme.text}
            onValueChange={setMandatoryDecks}
            value={mandatoryDecks}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.buttonBackground }]}
          onPress={handleSubmit}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>Aggiorna Torneo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});
