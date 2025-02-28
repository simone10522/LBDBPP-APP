import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';
import { lightPalette, darkPalette } from '../context/themes'; // Importa i temi
import { Picker } from '@react-native-picker/picker';

export default function CreateTournamentScreen() {
  const { user, isDarkMode } = useAuth(); // Usa useAuth per il tema
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [maxRounds, setMaxRounds] = useState('');
  const [bestOf, setBestOf] = useState<string | null>(null); // Cambiato a string | null
  const [error, setError] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const theme = isDarkMode ? darkPalette : lightPalette; // Determina il tema corrente

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

      const bestOfValue = parseInt(bestOf, 10); // Converti bestOf in un numero
      if (isNaN(bestOfValue)) {
          throw new Error("Valore Best of non valido.");
      }

      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([{ name, description, created_by: user?.id, start_date: startDate, max_players: maxPlayersValue, max_rounds: maxRoundsValue, best_of: bestOfValue }]) // Usa bestOfValue
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Crea Torneo</Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.text }]}>Tournament Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          type="text"
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
        <TouchableOpacity style={[styles.selectButton, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]} onPress={() => setDatePickerVisible(true)}>
          <Text style={[styles.selectButtonText, { color: theme.text }]}>{startDate || 'Select Date'}</Text>
        </TouchableOpacity>
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDatePickerVisible}
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={[styles.modalView, { backgroundColor: theme.cardBackground }]}>
              <Calendar
                style={{ backgroundColor: theme.cardBackground }}
                theme={{
                  calendarBackground: theme.cardBackground,
                  textSectionTitleColor: theme.text,
                  dayTextColor: theme.text,
                  todayTextColor: theme.buttonBackground,
                  selectedDayTextColor: theme.text,
                  selectedDayBackgroundColor: theme.buttonBackground,
                  monthTextColor: theme.text,
                  textDayFontWeight: '300',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '300',
                }}
                onDayPress={handleDateSelect}
                markedDates={startDate ? { [startDate]: { selected: true, selectedColor: '#4a90e2' } } : {}}
              />
              <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={() => setDatePickerVisible(false)}>
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Text style={[styles.label, { color: theme.text }]}>Max Players</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          keyboardType="number-pad"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="Unlimited"
          placeholderTextColor="#aaa"
        />
        <Text style={[styles.label, { color: theme.text }]}>Max Rounds</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          keyboardType="number-pad"
          value={maxRounds}
          onChangeText={setMaxRounds}
          placeholder="Unlimited"
          placeholderTextColor="#aaa"
        />
        <Text style={[styles.label, { color: theme.text }]}>Best of</Text>
        <Picker
          selectedValue={bestOf}
          onValueChange={(itemValue) => setBestOf(itemValue)}
          style={[styles.picker, { backgroundColor: theme.inputBackground, color: theme.text }]} // Aggiunto stile al picker
          itemStyle={{ color: theme.text }} // Stile per gli elementi del picker
        >
          <Picker.Item label="Select an option" value={null} />
          <Picker.Item label="Best of 1" value="1" />
          <Picker.Item label="Best of 3" value="3" />
          <Picker.Item label="Best of 5" value="5" />
        </Picker>

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handleSubmit}>
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>Crea Torneo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0', // Sarà sovrascritto dal tema
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333', // Sarà sovrascritto dal tema
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333', // Sarà sovrascritto dal tema
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white', // Sarà sovrascritto dal tema
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd', // Sarà sovrascritto dal tema
  },
  selectButton: {
    backgroundColor: 'white', // Sarà sovrascritto dal tema
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd', // Sarà sovrascritto dal tema
  },
  selectButtonText: {
    color: '#333', // Sarà sovrascritto dal tema
  },
  button: {
    backgroundColor: '#333', // Sarà sovrascritto dal tema
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white', // Sarà sovrascritto dal tema
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
    backgroundColor: 'white', // Sarà sovrascritto dal tema
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
  picker: {
    marginBottom: 10,
    // Aggiungi altri stili se necessario
  },
});
