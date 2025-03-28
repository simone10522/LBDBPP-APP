import React, { useState, useEffect, useCallback } from 'react';
    import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
    import { useNavigation, useRoute } from '@react-navigation/native';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';
    import { Calendar } from 'react-native-calendars';
    import { format } from 'date-fns';
    import { lightPalette, darkPalette } from '../context/themes';
    import { Picker } from '@react-native-picker/picker';

    const calculateSwissRounds = (players: number | null): number | null => {
      if (!players) return null;
      return Math.ceil(Math.log(players) / Math.log(4));
    };

    export default function CreateTournamentScreen() {
      const { user, isDarkMode } = useAuth();
      const navigation = useNavigation();
      const route = useRoute();
      const { tournamentData } = route.params || {};
      const [name, setName] = useState('');
      const [description, setDescription] = useState('');
      const [startDate, setStartDate] = useState('');
      const [maxPlayers, setMaxPlayers] = useState('');
      const [maxRounds, setMaxRounds] = useState('');
      const [bestOf, setBestOf] = useState<string | null>(null);
      const [tournamentType, setTournamentType] = useState<string | null>(null);
      const [error, setError] = useState('');
      const [isDatePickerVisible, setDatePickerVisible] = useState(false);
      const [isEditing, setIsEditing] = useState(false);
      const [isPrivate, setIsPrivate] = useState(false); // State for private tournament
      const [password, setPassword] = useState(''); // State for password

      const theme = isDarkMode ? darkPalette : lightPalette;

      useEffect(() => {
        if (tournamentData) {
          setIsEditing(true);
          setName(tournamentData.name || '');
          setDescription(tournamentData.description || '');
          setStartDate(tournamentData.start_date || '');
          setMaxPlayers(tournamentData.max_players?.toString() || '');
          setMaxRounds(tournamentData.max_rounds?.toString() || '');
          setBestOf(tournamentData.best_of?.toString() || null);
          setTournamentType(tournamentData.format || null);
          setIsPrivate(tournamentData.private || false); // Load private status
          setPassword(tournamentData.password || '');    // Load password
        } else {
          setIsEditing(false);
          setIsPrivate(false); // Default to public
          setPassword('');
        }
      }, [tournamentData]);

      useEffect(() => {
        if (tournamentType === 'swiss') {
          const rounds = calculateSwissRounds(parseInt(maxPlayers) || null);
          setMaxRounds(rounds ? rounds.toString() : '');
        }
      }, [tournamentType, maxPlayers]);


      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const maxPlayersValue = maxPlayers === '' ? null : parseInt(maxPlayers, 10);
          if (maxPlayersValue !== null && isNaN(maxPlayersValue)) {
            throw new Error("Numero massimo di giocatori non valido.");
          }
          const maxRoundsValue = maxRounds === '' ? null : parseInt(maxRounds, 10);
          if (maxRoundsValue !== null && isNaN(maxRoundsValue) && tournamentType !== 'round-robin') {
            throw new Error("Numero massimo di turni non valido.");
          }
          if (bestOf === null) {
            throw new Error("Seleziona un'opzione per Best of.");
          }

          const bestOfValue = parseInt(bestOf, 10);
          if (isNaN(bestOfValue)) {
            throw new Error("Valore Best of non valido.");
          }

          if (tournamentType === null) {
            throw new Error("Select a tournament type.");
          }

          if (isPrivate && password.length === 0) {
            throw new Error("Inserisci una password per il torneo privato.");
          }

          if (isEditing && tournamentData) {
            const { data: updatedTournament, error: updateError } = await supabase
              .from('tournaments')
              .update({
                name,
                description,
                start_date: startDate,
                max_players: maxPlayersValue,
                max_rounds: maxRoundsValue,
                best_of: bestOfValue,
                format: tournamentType,
                private: isPrivate, // Update private status
                password: isPrivate ? password : null, // Update password
              })
              .eq('id', tournamentData.id)
              .select()
              .single();

            if (updateError) throw updateError;
            navigation.navigate('TournamentDetails', { id: updatedTournament.id, refresh: true });


          } else {
            const { data: tournament, error: tournamentError } = await supabase
              .from('tournaments')
              .insert([{
                name,
                description,
                created_by: user?.id,
                start_date: startDate,
                max_players: maxPlayersValue,
                max_rounds: maxRoundsValue,
                best_of: bestOfValue,
                format: tournamentType,
                private: isPrivate, // Insert private status
                password: isPrivate ? password : null, // Insert password
              }])
              .select()
              .single();
            if (tournamentError) throw tournamentError;
            navigation.navigate('TournamentDetails', { id: tournament.id });
          }


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

      const handleTournamentTypeChange = useCallback((itemValue) => {
        setTournamentType(itemValue);
        if (itemValue === 'swiss') {
          const rounds = calculateSwissRounds(parseInt(maxPlayers) || null);
          setMaxRounds(rounds ? rounds.toString() : '');
        } else if (itemValue === 'round-robin') {
          if (maxPlayers) {
            const players = parseInt(maxPlayers, 10);
            if (!isNaN(players) && players > 0) {
              setMaxRounds((players - 1).toString());
            } else {
              setMaxRounds(''); // Clear maxRounds if maxPlayers is invalid
            }
          } else {
            setMaxRounds(''); // Clear maxRounds if maxPlayers is empty
          }
        }
      }, [maxPlayers, setMaxRounds, setTournamentType]);


      return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.formContainer, { paddingBottom: 40 }]}>
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

              <Text style={[styles.label, { color: theme.text }]}>Tournament Type</Text>
              <Picker
                selectedValue={tournamentType}
                onValueChange={handleTournamentTypeChange}
                style={[styles.picker, { backgroundColor: theme.inputBackground, color: theme.text }]}
                itemStyle={{ color: theme.text }}
              >
                <Picker.Item label="Select an option" value={null} />
                <Picker.Item label="Swiss Tournament" value="swiss" />
                <Picker.Item label="Round-Robin" value="round-robin" />
              </Picker>

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
                placeholder={tournamentType === 'round-robin' ? 'N/A for Round-Robin' : (tournamentType === 'swiss' ? 'Calculated Automatically (Min: ' + maxRounds + ')' : 'Unlimited')}
                placeholderTextColor="#aaa"
                editable={tournamentType !== 'round-robin'}
              />
              <Text style={[styles.label, { color: theme.text }]}>Best of</Text>
              <Picker
                selectedValue={bestOf}
                onValueChange={(itemValue) => setBestOf(itemValue)}
                style={[styles.picker, { backgroundColor: theme.inputBackground, color: theme.text }]}
                itemStyle={{ color: theme.text }}
              >
                <Picker.Item label="Select an option" value={null} />
                <Picker.Item label="Best of 1" value="1" />
                <Picker.Item label="Best of 3" value="3" />
                <Picker.Item label="Best of 5" value="5" />
              </Picker>

              {/* Private Tournament Section */}
              <Text style={[styles.label, { color: theme.text }]}>Private</Text>
              <View style={styles.privateButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.privateButton,
                    isPrivate === false && styles.selectedPrivateButton,
                    { backgroundColor: isPrivate === false ? theme.buttonBackground : theme.inputBackground, borderColor: theme.borderColor },
                  ]}
                  onPress={() => setIsPrivate(false)}
                >
                  <Text style={[styles.privateButtonText, { color: isPrivate === false ? theme.buttonText : theme.text }]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.privateButton,
                    isPrivate === true && styles.selectedPrivateButton,
                    { backgroundColor: isPrivate === true ? theme.buttonBackground : theme.inputBackground, borderColor: theme.borderColor },
                  ]}
                  onPress={() => setIsPrivate(true)}
                >
                  <Text style={[styles.privateButtonText, { color: isPrivate === true ? theme.buttonText : theme.text }]}>Yes</Text>
                </TouchableOpacity>
              </View>

              {isPrivate && (
                <>
                  <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true} // Hide the password
                    placeholder="Enter password"
                    placeholderTextColor="#aaa"
                  />
                </>
              )}
              {/* End Private Tournament Section */}

              <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handleSubmit}>
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>{isEditing ? 'Salva Modifiche' : 'Crea Torneo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f0f0f0',
        // paddingBottom: 70, // Rimuovi o commenta questa riga
      },
      formContainer: { // Aggiungi questo stile
        paddingBottom: 70,
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
      },
      privateButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
      },
      privateButton: {
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        width: '45%', // Adjust as needed
        alignItems: 'center',
      },
      selectedPrivateButton: {
        // Add styles for the selected button
      },
      privateButtonText: {
        // Add styles for the button text
      },
    });
