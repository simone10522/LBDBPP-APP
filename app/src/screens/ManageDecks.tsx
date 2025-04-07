import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/_useAuth';
import { useNavigation, useSearchParams } from '@react-navigation/native';
import { EnergyIcon } from '../components/EnergyIcon';

const energies = ['fuoco', 'acqua', 'elettro', 'normale', 'erba', 'oscurità', 'lotta', 'acciaio', 'psico'];

export default function ManageDecks() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [deck1, setDeck1] = useState<string[]>([]);
  const [deck2, setDeck2] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const [hasDeck, setHasDeck] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchExistingDeck = async () => {
      const participantIdParam = searchParams.get('participantId');
      if (!participantIdParam || !user) return;
      try {
        const { data, error } = await supabase
          .from('tournament_participants')
          .select('id, deck')
          .eq('id', participantIdParam)
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
            setParticipantId(data.id);
          } else {
            setHasDeck(true);
            setParticipantId(data.id);
          }
        }
      } catch (error: any) {
        console.error("Error fetching existing deck:", error);
        setHasDeck(false);
        setParticipantId(null);
      }
    };
    fetchExistingDeck();
  }, [searchParams, user?.id]);

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
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Gestisci Mazzi</Text>
      <View style={styles.deckContainer}>
        <Text style={styles.deckTitle}>Deck 1</Text>
        <View style={styles.energyList}>
          {energies.map((energy) => (
            <TouchableOpacity key={energy} style={styles.energyItem} onPress={() => handleEnergyChange(1, energy, !deck1.includes(energy))}>
              <EnergyIcon energy={energy} style={deck1.includes(energy) ? styles.selectedEnergyIcon : styles.energyIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.deckContainer}>
        <Text style={styles.deckTitle}>Deck 2</Text>
        <View style={styles.energyList}>
          {energies.map((energy) => (
            <TouchableOpacity key={energy} style={styles.energyItem} onPress={() => handleEnergyChange(2, energy, !deck2.includes(energy))}>
              <EnergyIcon energy={energy} style={deck2.includes(energy) ? styles.selectedEnergyIcon : styles.energyIcon} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
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
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  deckContainer: {
    marginBottom: 20,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
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
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
});
