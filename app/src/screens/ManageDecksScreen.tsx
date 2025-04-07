import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EnergyIcon } from '../components/EnergyIcon';
import { lightPalette, darkPalette } from '../context/themes';

const energies = ['fuoco', 'acqua', 'elettro', 'normale', 'erba', 'oscurità', 'lotta', 'acciaio', 'psico'];

export default function ManageDecksScreen() {
  const { user, isDarkMode } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { participantId } = route.params as { participantId: string };
  const [deck1, setDeck1] = useState<string[]>([]);
  const [deck2, setDeck2] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [hasDeck, setHasDeck] = useState(false);

  const palette = isDarkMode ? darkPalette : lightPalette;

  useEffect(() => {
    const fetchExistingDeck = async () => {
      if (!participantId || !user) return;
      try {
        const { data, error } = await supabase
          .from('tournament_participants')
          .select('deck')
          .eq('id', participantId)
          .single();
        if (error) {
          console.error("Error fetching existing deck:", error);
          setHasDeck(false);
          setError(error.message);
        } else {
          if (data?.deck) {
            setDeck1(data.deck.deck1 || []);
            setDeck2(data.deck.deck2 || []);
            setHasDeck(true);
          } else {
            setHasDeck(true);
          }
        }
      } catch (error: any) {
        console.error("Error fetching existing deck:", error);
        setHasDeck(false);
      }
    };
    fetchExistingDeck();
  }, [participantId, user?.id]);

  const handleEnergyChange = (deck: 1 | 2, energy: string, checked: boolean) => {
    const newDeck = checked ? [...(deck === 1 ? deck1 : deck2), energy] : (deck === 1 ? deck1 : deck2).filter(e => e !== energy);
    if (deck === 1) setDeck1(newDeck); else setDeck2(newDeck);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deck1.length === 0 || deck2.length === 0) {
      setError('Devi selezionare almeno un’energia per ogni deck.');
      return;
    }
    try {
      if (!user || !participantId) throw new Error('Utente o partecipante non valido');
      const deckData = { deck1, deck2 };
      if (hasDeck && participantId) {
        const { error } = await supabase
          .from('tournament_participants')
          .update({ deck: deckData })
          .eq('id', participantId);
        if (error) throw error;
      }
      navigation.goBack();
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Errore', error.message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>Gestisci Mazzi</Text>
      <View style={styles.deckContainer}>
        <Text style={[styles.deckTitle, { color: palette.text }]}>Deck 1</Text>
        <View style={styles.energyList}>
          {energies.map((energy) => (
            <TouchableOpacity key={energy} style={styles.energyItem} onPress={() => handleEnergyChange(1, energy, !deck1.includes(energy))}>
              <EnergyIcon energy={energy} style={deck1.includes(energy) ? styles.selectedEnergyIcon : styles.energyIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.deckContainer}>
        <Text style={[styles.deckTitle, { color: palette.text }]}>Deck 2</Text>
        <View style={styles.energyList}>
          {energies.map((energy) => (
            <TouchableOpacity key={energy} style={styles.energyItem} onPress={() => handleEnergyChange(2, energy, !deck2.includes(energy))}>
              <EnergyIcon energy={energy} style={deck2.includes(energy) ? styles.selectedEnergyIcon : styles.energyIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: palette.buttonBackground }]} onPress={handleSubmit}>
        <Text style={[styles.buttonText, { color: palette.buttonText }]}>Save</Text>
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: palette.error }]}>{error}</Text>}
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
    marginBottom: 20,
    color: '#333', // Sarà sovrascritto dal tema
    textAlign: 'center',
  },
  deckContainer: {
    marginBottom: 20,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333', // Sarà sovrascritto dal tema
  },
  energyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  energyItem: {
    marginRight: 10,
    marginBottom: 10,
  },
  energyIcon: {
    width: 40,
    height: 40,
    opacity: 0.5,
  },
  selectedEnergyIcon: {
    width: 40,
    height: 40,
    opacity: 1,
  },
  button: {
    backgroundColor: '#4a90e2', // Sarà sovrascritto dal tema
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white', // Sarà sovrascritto dal tema
    fontWeight: 'bold',
  },
  error: {
    color: 'red', // Sarà sovrascritto dal tema
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
