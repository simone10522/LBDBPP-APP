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
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_by: string;
  max_players: number | null;
  format: string | null; // Add format property
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
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: theme.background }]}>
        <TextInput
          style={[styles.searchBar, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Cerca tornei..."
          placeholderTextColor={theme.inputPlaceholder}
          value={searchTerm}
          onChangeText={handleSearchChange}
        />
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>Compatto</Text>
          <Switch
            value={isCardMinimized}
            onValueChange={toggleCardSize}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isCardMinimized ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      </View>

      {loading ? (
        <Text style={[styles.loadingText, { color: theme.text }]}>Caricamento...</Text>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : tournaments.length === 0 ? (
        <View style={[styles.noTournaments, { backgroundColor: theme.background }]}>
          <Image source={tournamentIcon} style={styles.noTournamentsIcon} />
          <Text style={[styles.noTournamentsText, { color: theme.text }]}>Nessun Torneo Disponibile</Text>
          <Text style={[styles.noTournamentsSubText, { color: theme.secondaryText }]}>Inizia creando un Torneo!</Text>
        </View>
      ) : (
        <View style={[styles.tournamentsContainer, { backgroundColor: theme.background }]}>
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
                <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], backgroundColor: theme.cardBackground }]}>
                  <View style={styles.cardHeader}>
                    <Image source={tournamentIcon} style={styles.cardIcon} />
                    <Text style={[styles.cardCreatorText, { color: theme.secondaryText }]}>Creato da: {tournament.created_by}</Text>
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
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{tournament.name}</Text>
                  <Text style={[styles.cardFormat, { color: theme.secondaryText }]}>
                    {tournament.format ? (tournament.format === 'swiss' ? 'Swiss Tournament' : 'Round-Robin') : 'Format Not Set'}
                  </Text>
                  {!isCardMinimized && (
                    <View>
                      <Text style={[styles.cardDescription, { color: theme.secondaryText }]}>{tournament.description}</Text>
                      <Text style={[styles.cardInfo, { color: theme.secondaryText }]}>
                        Max Players: {tournament.max_players === null ? 'Unlimited' : tournament.max_players}
                      </Text>
                      <Text style={[styles.cardInfo, { color: theme.secondaryText }]}>
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
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginRight: 10,
  },
  loadingText: {
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
    fontWeight: 'bold',
    marginBottom: 5,
  },
  noTournamentsSubText: {
    fontSize: 14,
  },
  tournamentsContainer: {
    paddingHorizontal: 10,
  },
  cardContainer: {
    marginBottom: 10,
  },
  card: {
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
    fontSize: 14,
  },
  cardStatus: {
    color: '#fff',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardFormat: {
    fontSize: 14,
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  cardInfo: {
    fontSize: 12,
    marginBottom: 3,
  },
});

export default TournamentList;
