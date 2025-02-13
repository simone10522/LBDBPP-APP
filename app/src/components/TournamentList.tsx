import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import tournamentIcon from '../../assets/tournament_icon.png';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_by: string;
  max_players: number | null;
}

interface TournamentListProps {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  searchTerm: string;
  handleSearchChange: (text: string) => void;
  isCardMinimized: boolean;
  toggleCardSize: () => void;
}

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  loading,
  error,
  onRefresh,
  searchTerm,
  handleSearchChange,
  isCardMinimized,
  toggleCardSize,
}) => {
  const navigation = useNavigation();
  const cardScalesRef = useRef<Animated.Value[]>([]);

  useEffect(() => {
    cardScalesRef.current = tournaments.map(() => new Animated.Value(1));
  }, [tournaments]);

  const animateCard = (cardScale: Animated.Value) => {
    Animated.timing(cardScale, {
      toValue: 0.95,
      duration: 50,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const resetCard = (cardScale: Animated.Value) => {
    Animated.timing(cardScale, {
      toValue: 1,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };


  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Cerca tornei..."
          placeholderTextColor="#aaa"
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Compatto</Text>
          <Switch
            value={isCardMinimized}
            onValueChange={toggleCardSize}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isCardMinimized ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Caricamento...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : tournaments.length === 0 ? (
        <View style={styles.noTournaments}>
          <Image source={tournamentIcon} style={styles.noTournamentsIcon} />
          <Text style={styles.noTournamentsText}>Nessun Torneo Disponibile</Text>
          <Text style={styles.noTournamentsSubText}>Inizia creando un Torneo!</Text>
        </View>
      ) : (
        <View style={styles.tournamentsContainer}>
          {tournaments.map((tournament, index) => {
            const cardScale = cardScalesRef.current[index] || new Animated.Value(1);
            return (
              <TouchableOpacity
                key={tournament.id}
                style={styles.cardContainer}
                onPress={() => navigation.navigate('TournamentDetails', { id: tournament.id })}
                onPressIn={() => animateCard(cardScale)}
                onPressOut={() => resetCard(cardScale)}
                activeOpacity={1}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
                  <View style={styles.cardHeader}>
                    <Image source={tournamentIcon} style={styles.cardIcon} />
                    <Text style={styles.cardCreatorText}>Creato da: {tournament.created_by}</Text>
                    <Text
                      style={[
                        styles.cardStatus,
                        {
                          backgroundColor:
                            tournament.status === 'completed'
                              ? '#2ecc71'
                              : tournament.status === 'in_progress'
                              ? '#e67e22'
                              : '#7f8c8d',
                        },
                      ]}
                    >
                      {tournament.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{tournament.name}</Text>
                  {!isCardMinimized && (
                    <View>
                      <Text style={styles.cardDescription}>{tournament.description}</Text>
                      <Text style={styles.cardInfo}>
                        Max Players: {tournament.max_players === null ? 'Unlimited' : tournament.max_players}
                      </Text>
                      <Text style={styles.cardInfo}>
                        Created: {new Date(tournament.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const darkPalette = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  text: '#FFFFFF',
  secondaryText: '#AAAAAA',
  accent: '#BB86FC',
  button: '#3700B3',
  buttonText: '#FFFFFF',
  inputBackground: '#2C2C2C',
  inputPlaceholder: '#AAAAAA',
  statusCompleted: '#2ecc71',
  statusInProgress: '#e67e22',
  statusDraft: '#7f8c8d',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchBar: {
    flex: 1,
    backgroundColor: darkPalette.inputBackground,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    color: darkPalette.text,
    marginRight: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    color: darkPalette.text,
    marginRight: 10,
  },
  loadingText: {
    color: darkPalette.text,
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  noTournaments: {
    alignItems: 'center',
    padding: 40,
  },
  noTournamentsIcon: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  noTournamentsText: {
    fontSize: 18,
    color: darkPalette.text,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noTournamentsSubText: {
    fontSize: 14,
    color: darkPalette.secondaryText,
  },
  tournamentsContainer: {
    paddingHorizontal: 10,
  },
  cardContainer: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: darkPalette.cardBackground,
    borderRadius: 10,
    padding: 15,
    width: Dimensions.get('window').width - 40,
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
  cardCreatorText: {
    flex: 1,
    color: darkPalette.secondaryText,
    fontSize: 14,
  },
  cardStatus: {
    color: darkPalette.buttonText,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: darkPalette.text,
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: darkPalette.secondaryText,
    marginBottom: 5,
  },
  cardInfo: {
    fontSize: 12,
    color: darkPalette.secondaryText,
    marginBottom: 3,
  },
});

export default TournamentList;
