import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';

export default function CreateTournamentScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [maxRounds, setMaxRounds] = useState('');
  const [error, setError] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

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
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([{ name, description, created_by: user?.id, start_date: startDate, max_players: maxPlayersValue, max_rounds: maxRoundsValue }])
        .select()
        .single();
      if (tournamentError) throw tournamentError;
      navigation.navigate('TournamentDetails', { id: tournament.id });
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Errore', error.message);
    }
  };

  const handleDateSelect = (day: any) => {
    const formattedDate = format(new Date(day.dateString), 'yyyy-MM-dd');
    setStartDate(formattedDate);
    setDatePickerVisible(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crea Torneo</Text>
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
        <TouchableOpacity style={styles.selectButton} onPress={() => setDatePickerVisible(true)}>
          <Text style={styles.selectButtonText}>{startDate || 'Select Date'}</Text>
        </TouchableOpacity>
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDatePickerVisible}
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Calendar
                onDayPress={handleDateSelect}
                markedDates={startDate ? { [startDate]: { selected: true, selectedColor: '#4a90e2' } } : {}}
              />
              <TouchableOpacity style={styles.button} onPress={() => setDatePickerVisible(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Crea Torneo</Text>
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
    backgroundColor: '#4a90e2',
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
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
