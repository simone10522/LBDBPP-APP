import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
  Switch,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import tournamentIcon from '../../assets/tournament_icon.png';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { Lock, Unlock } from 'lucide-react-native'; // Import LockOpen

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_by: string;
  max_players: number | null;
  format: string | null;
  private: boolean;
  password?: string;
}

interface TournamentListProps {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const StatusIndicator: React.FC<{ status: Tournament['status'] }> = ({ status }) => {
  const statusStyles = StyleSheet.create({
    indicator: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 5,
      color: '#fff',
      fontWeight: 'bold',
      textTransform: 'capitalize',
    },
    draft: { backgroundColor: '#7f8c8d' },
    in_progress: { backgroundColor: '#e67e22' },
    completed: { backgroundColor: '#2ecc71' },
  });

  return (
    <Text style={[statusStyles.indicator, statusStyles[status]]}>
      {status.replace(/_/g, ' ')}
    </Text>
  );
};

const LockIcon: React.FC<{ isPrivate: boolean }> = ({ isPrivate }) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;

  return isPrivate ? (
    <Lock color={theme.text} size={20} />
  ) : (
    <Unlock color={theme.text} size={20} /> // Use LockOpen
  );
};

const TournamentCard: React.FC<{ tournament: Tournament; isCardMinimized: boolean; onPress: () => void }> =
  React.memo(({ tournament, isCardMinimized, onPress }) => {
    const { isDarkMode } = useAuth();
    const theme = isDarkMode ? darkPalette : lightPalette;
    const cardScale = useRef(new Animated.Value(1)).current;

    const animateCard = () => {
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 50,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    };

    const resetCard = () => {
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        onPressIn={animateCard}
        onPressOut={resetCard}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={tournament.name}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], backgroundColor: theme.cardBackground }]}>
          {!isCardMinimized && (
            <View style={styles.cardHeader}>
              <Image source={tournamentIcon} style={styles.cardIcon} />
              <Text style={[styles.cardCreatorText, { color: theme.secondaryText }]}>
                Creato da: {tournament.created_by}
              </Text>
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.titleContainer}>
            <LockIcon isPrivate={tournament.private} />  
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {tournament.name}
              </Text>
              <StatusIndicator status={tournament.status} />
            </View>

            {!isCardMinimized && (
              <>
                <Text style={[styles.cardFormat, { color: theme.secondaryText }]}>
                  {tournament.format ? (tournament.format === 'swiss' ? 'Swiss' : 'Round-Robin') : 'Format Not Set'}
                </Text>
                <Text style={[styles.cardDescription, { color: theme.secondaryText }]} numberOfLines={2}>
                  {tournament.description}
                </Text>
                <Text style={[styles.cardInfo, { color: theme.secondaryText }]}>
                  Max Players: {tournament.max_players === null ? 'Unlimited' : tournament.max_players}
                </Text>
                <Text style={[styles.cardInfo, { color: theme.secondaryText }]}>
                  Created: {new Date(tournament.created_at).toLocaleDateString()}
                </Text>
              </>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  });

const SearchBar: React.FC<{ onSearchChange: (text: string) => void; isCardMinimized: boolean; toggleCardSize: () => void }> = React.memo(({ onSearchChange, isCardMinimized, toggleCardSize }) => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    onSearchChange(text);
  };

  return (
    <View style={[styles.searchBarContainer, { backgroundColor: theme.background }]}>
      <TextInput
        style={[styles.searchBar, { backgroundColor: theme.inputBackground, color: theme.text }]}
        placeholder="Find Tournaments..."
        placeholderTextColor={theme.secondaryText}
        value={searchTerm}
        onChangeText={handleSearchChange}
        accessibilityRole="search"
      />
      <View style={styles.switchContainer}>
        <Text style={[styles.switchLabel, { color: theme.text }]}>Compact</Text>
        <Switch
          value={isCardMinimized}
          onValueChange={toggleCardSize}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isCardMinimized ? '#f5dd4b' : '#f4f3f4'}
          accessibilityRole="switch"
          accessibilityLabel="Toggle compact mode"
        />
      </View>
    </View>
  );
});

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  loading,
  error,
  onRefresh,
}) => {
  const navigation = useNavigation();
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const [searchTerm, setSearchTerm] = useState('');
  const [isCardMinimized, setIsCardMinimized] = useState(false);

  const handleSearchChange = useCallback((text: string) => {
    setSearchTerm(text);
  }, []);

  const toggleCardSize = useCallback(() => {
    setIsCardMinimized((prev) => !prev);
  }, []);

  const filteredTournaments = tournaments.filter((tournament) =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Caricamento...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SearchBar
        onSearchChange={handleSearchChange}
        isCardMinimized={isCardMinimized}
        toggleCardSize={toggleCardSize}
      />

      {filteredTournaments.length === 0 ? (
        <View style={[styles.noTournaments, { backgroundColor: theme.background }]}>
          <Image source={tournamentIcon} style={styles.noTournamentsIcon} />
          <Text style={[styles.noTournamentsText, { color: theme.text }]}>Nessun Torneo Disponibile</Text>
          <Text style={[styles.noTournamentsSubText, { color: theme.secondaryText }]}>Inizia creando un Torneo!</Text>
        </View>
      ) : (
        <View style={[styles.tournamentsContainer, { backgroundColor: theme.background }]}>
          {filteredTournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              isCardMinimized={isCardMinimized}
              onPress={() => navigation.navigate('TournamentDetails', { id: tournament.id })}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
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
    width: Dimensions.get('window').width - 20,
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
  cardContent: {
    marginTop: 5,
  },
titleContainer: {
  flexDirection: 'row', // Allinea gli elementi in riga
  alignItems: 'center', // Allinea verticalmente
  gap: 8, // Spazio tra gli elementi (React Native 0.71+)
},
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  cardFormat: {
    fontSize: 14,
    marginBottom: 1,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 1,
  },
  cardInfo: {
    fontSize: 12,
    marginBottom: 3,
  },
  lockIconContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
});

export default TournamentList;
