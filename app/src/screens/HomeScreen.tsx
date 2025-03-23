import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import TournamentList from '../components/TournamentList';
// No need to import AsyncStorage
import { lightPalette, darkPalette } from '../context/themes'; // Import palettes
import BannerAdComponent from '../components/BannerAd';
import { TestIds } from 'react-native-google-mobile-ads';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_at: string;
  created_by: string;
  max_players: number | null;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const createButtonScale = useRef(new Animated.Value(1)).current;
  const loginButtonScale = useRef(new Animated.Value(1)).current;
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [isCardMinimized, setIsCardMinimized] = useState(false);

  const logoTopPosition = useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const logoBottomPosition = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  const { isDarkMode } = useAuth(); // Get isDarkMode from useAuth

  // No need for useEffect to load theme

  const theme = isDarkMode ? darkPalette : lightPalette; // Determine the theme

  // ... (rest of your component, using the theme object as before) ...

    const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        setUsername('Guest');
        setProfileImage('');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, profile_image')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUsername(data?.username || 'Guest');
      setProfileImage(data?.profile_image || '');
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUsername('Guest');
      setProfileImage('');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserTournaments = useCallback(async () => {
    if (!user) {
      setUserTournaments([]);
      return;
    }
    setTournamentLoading(true);
    try {
      const { data: createdTournaments, error: createdError } = await supabase
        .from('tournaments')
        .select('*, profiles!tournaments_created_by_fkey(username)')
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      const { data: participantTournaments, error: participantError } = await supabase
        .from('tournament_participants')
        .select('tournament_id, tournaments(*, profiles!tournaments_created_by_fkey(username))')
        .eq('participant_id', user.id);

      if (participantError) throw participantError;

      let tournaments = [];
      if (createdTournaments) {
        tournaments = tournaments.concat(createdTournaments.map((tournament: any) => ({
          ...tournament,
          created_by: tournament.profiles?.username || 'Unknown',
        })));
      }
      if (participantTournaments) {
        tournaments = tournaments.concat(participantTournaments.map(pt => ({
          ...pt.tournaments,
          created_by: pt.tournaments?.profiles?.username || 'Unknown',
        })));
      }

      const uniqueTournaments = Array.from(new Set(tournaments.map(t => t.id))).map(id => {
        return tournaments.find(t => t.id === id);
      });
      setUserTournaments(uniqueTournaments as Tournament[]);
      setAllTournaments(uniqueTournaments as Tournament[]);
      filterTournaments(uniqueTournaments as Tournament[], searchTerm);
    } catch (error: any) {
      setTournamentError(error.message);
    } finally {
      setTournamentLoading(false);
    }
  }, [user, searchTerm]);

  const filterTournaments = (tournamentsToFilter: Tournament[], term: string) => {
    const filtered = term
      ? tournamentsToFilter.filter(
          (tournament) =>
            tournament.name.toLowerCase().includes(term.toLowerCase()) ||
            tournament.description.toLowerCase().includes(term.toLowerCase())
        )
      : tournamentsToFilter;
    setUserTournaments(filtered);
  };

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchUserTournaments();
  }, [fetchUserTournaments]);

  useEffect(() => {
    Animated.timing(logoTopPosition, {
      toValue: 0,
      duration: 1000,
      easing: Easing.easeOut,
      useNativeDriver: true,
    }).start();

    Animated.timing(logoBottomPosition, {
      toValue: 0,
      duration: 1000,
      easing: Easing.easeOut,
      useNativeDriver: true,
    }).start();
  }, [logoTopPosition, logoBottomPosition]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData().finally(() => setRefreshing(false));
  }, [fetchUserData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigation.navigate('Login');
  };

  const toggleDropdown = () => {
    setDropdownVisible(!isDropdownVisible);
    Animated.timing(dropdownOpacity, {
      toValue: isDropdownVisible ? 0 : 1,
      duration: 200,
      easing: Easing.easeOut,
      useNativeDriver: true,
    }).start();
  };

  const animateButton = (buttonScale: Animated.Value) => {
    Animated.timing(buttonScale, {
      toValue: 0.9,
      duration: 50,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const resetButton = (buttonScale: Animated.Value) => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 150,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };
  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterTournaments(allTournaments, text);
  };

  const toggleCardSize = () => {
    setIsCardMinimized(!isCardMinimized);
  };

  return (
    <View style={[styles.backgroundImage, { backgroundColor: theme.background }]}>
      <View style={[styles.container]}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />} // Apply theme to refreshControl
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Animated.Image
            source={require('../../assets/logotop.png')}
            style={[styles.logoTop, { transform: [{ translateX: logoTopPosition }] }]}
            resizeMode="contain"
          />
          <Animated.Image
            source={require('../../assets/logobot.png')}
            style={[styles.logoBottom, { transform: [{ translateX: logoBottomPosition }] }]}
            resizeMode="contain"
          />

          <View style={styles.header} />
          <View style={styles.yourTournamentsSection}>
            <Text style={[styles.yourTournamentsTitle, { color: theme.text }]}>Your Tournaments</Text>
            {!user && (
              <Text style={[styles.noTournamentsText, { color: theme.text }]}>
                Nessun Torneo Disponibile, Esegui il Login
              </Text>
            )}
            {user && (
              <TournamentList
                tournaments={userTournaments}
                loading={tournamentLoading}
                error={tournamentError}
                onRefresh={onRefresh}
                searchTerm={searchTerm}
                handleSearchChange={handleSearchChange}
                isCardMinimized={isCardMinimized}
                toggleCardSize={toggleCardSize}
              />
            )}
          </View>
        </ScrollView>
        <View style={styles.bottomButtonsContainer}>
          {!user ? (
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.buttonBackground }]}
              onPress={() => navigation.navigate('Login')}
              onPressIn={() => animateButton(loginButtonScale)}
              onPressOut={() => resetButton(loginButtonScale)}
            >
              <Animated.Text style={[styles.loginButtonText, { transform: [{ scale: loginButtonScale }], color: theme.buttonText }]}>
                Accedi
              </Animated.Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.buttonBackground }]}
              onPress={() => navigation.navigate('CreateTournament')}
              onPressIn={() => animateButton(createButtonScale)}
              onPressOut={() => resetButton(createButtonScale)}
            >
              <Animated.Text style={[styles.createButtonText, { transform: [{ scale: createButtonScale }], color: theme.buttonText }]}>
                Create Tournament
              </Animated.Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.bannerAdContainer}>
          <BannerAdComponent />
        </View>
      </View>
    </View>
  );
};



const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    backgroundColor: 'transparent', // set background color here
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.5)', // Removed grey overlay
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  logoTop: {
    width: 550,
    height: 75,
    marginTop: 70,
    alignSelf: 'center',
  },
  logoBottom: {
    width: 350,
    height: 75,
    marginBottom: 20,
    alignSelf: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    display: 'none',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
    marginBottom: 20,
    display: 'none',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 10,
    borderRadius: 5,
    width: 160,
    paddingVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderWidth: 1,
  },
  loginButtonText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderWidth: 1,
  },
  createButtonText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  bottomButtonsContainer: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  yourTournamentsSection: {
    marginTop: 30,
    paddingHorizontal: 0,
  },
  yourTournamentsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  noTournamentsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
    bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10, // Add some padding to separate from buttons
  },
});

export default HomeScreen;
