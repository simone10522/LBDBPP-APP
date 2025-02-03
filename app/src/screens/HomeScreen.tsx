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
  Modal,
  ImageBackground,
  TextInput,
  Switch,
  Animated, // Import Animated
  Easing, // Import Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Card } from 'react-native-elements';
import background from '../../assets/button_corner.png';
import heroBackground from '../../assets/pokemon_hero_bg.png';
import tournamentIcon from '../../assets/tournament_icon.png';
import LogoIcon from '../../assets/LOGO.png';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  created_by: string;
  max_players: number | null;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [isCardMinimized, setIsCardMinimized] = useState(false);
  const dropdownOpacity = useRef(new Animated.Value(0)).current; // Animated value for opacity

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, profiles!tournaments_created_by_fkey(username)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        console.log('Fetched tournaments:', data);
        const tournamentsWithUsername = data.map((tournament: any) => ({
          ...tournament,
          created_by: tournament.profiles?.username || 'Unknown',
        }));
        setAllTournaments(tournamentsWithUsername);
        filterTournaments(tournamentsWithUsername, searchTerm);
      } else {
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      }
    } catch (error: any) {
      console.error('Error during tournament fetch:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const filterTournaments = (tournamentsToFilter: Tournament[], term: string) => {
    if (term) {
      const filtered = tournamentsToFilter.filter(
        (tournament) =>
          tournament.name.toLowerCase().includes(term.toLowerCase()) ||
          tournament.description.toLowerCase().includes(term.toLowerCase())
      );
      setTournaments(filtered);
    } else {
      setTournaments(tournamentsToFilter);
    }
  };

  const fetchUserData = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, profile_image')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching user data:', error);
          setUsername('Guest');
          setProfileImage('');
        } else {
          setUsername(data?.username || 'Guest');
          setProfileImage(data?.profile_image || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUsername('Guest');
        setProfileImage('');
      }
    } else {
      setUsername('Guest');
      setProfileImage('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
    fetchUserData();
  }, [user, fetchTournaments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTournaments().finally(() => setRefreshing(false));
  }, [fetchTournaments]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigation.navigate('Login');
  };

  const toggleDropdown = () => {
    setDropdownVisible(!isDropdownVisible);
    if (!isDropdownVisible) {
      Animated.timing(dropdownOpacity, {
        toValue: 1,
        duration: 200, // Animation duration
        easing: Easing.easeOut, // Easing function
        useNativeDriver: true, // For better performance
      }).start();
    } else {
      Animated.timing(dropdownOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.easeOut,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterTournaments(allTournaments, text);
  };

  const toggleCardSize = () => {
    setIsCardMinimized(!isCardMinimized);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.heroSection}>
          <ImageBackground
            source={heroBackground}
            style={styles.heroBackground}
            resizeMode="cover"
          >
            <Image
              source={LogoIcon}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={styles.heroTitle}>Benvenuto nella Lega Pokémon!</Text>
          </ImageBackground>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateTournament')}
          >
            <ImageBackground source={background} style={styles.buttonBackground} resizeMode="stretch">
              <Text style={styles.createButtonText}>Crea Torneo</Text>
            </ImageBackground>
          </TouchableOpacity>
          {!user && (
            <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButtonText}>Accedi</Text>
            </TouchableOpacity>
          )}
          {user && (
            <View style={styles.userContainer}>
              <TouchableOpacity onPress={toggleDropdown} ref={dropdownRef}>
                <Text style={styles.username}>{username}</Text>
              </TouchableOpacity>
              {profileImage && (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              )}
              <Modal
                transparent={true}
                visible={isDropdownVisible}
                onRequestClose={() => setDropdownVisible(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setDropdownVisible(false)}
                >
                  <Animated.View // Use Animated.View
                    style={[
                      styles.dropdown,
                      {
                        opacity: dropdownOpacity, // Apply animated opacity
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Profile')} // Navigate to ProfileScreen
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>Logout</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </TouchableOpacity>
              </Modal>
            </View>
          )}
        </View>

        <View style={styles.searchBarAndSwitchContainer}>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Cerca tornei..."
              placeholderTextColor="#aaa"
              value={searchTerm}
              onChangeText={handleSearchChange}
            />
          </View>
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

        {loading && <Text>Caricamento...</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.tournamentsContainer}>
          {tournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              onPress={() => navigation.navigate('TournamentDetails', { id: tournament.id })}
            >
              <Card containerStyle={[styles.card, isCardMinimized ? styles.cardMinimized : {}]}>
                <View style={styles.cardHeader}>
                  <Image source={tournamentIcon} alt="Tournament Icon" style={styles.cardIcon} />
                  <Text style={styles.cardCreatorId}>Creato da: {tournament.created_by}</Text>
                  <Text
                    style={[
                      styles.cardStatus,
                      {
                        backgroundColor:
                          tournament.status === 'completed'
                            ? 'green'
                            : tournament.status === 'in_progress'
                            ? 'rgba(245, 132, 66, 1.0)'
                            : 'gray',
                      },
                    ]}
                  >
                    {tournament.status.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>{tournament.name}</Text>
                {!isCardMinimized && (
                  <View>
                    <Text style={styles.cardDescription}>{tournament.description}</Text>
                    <Text style={styles.cardMaxPlayers}>
                      Max Players: {tournament.max_players === null ? 'Unlimited' : tournament.max_players}
                    </Text>
                    <Text style={styles.cardDate}>
                      Created {new Date(tournament.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {tournaments.length === 0 && !loading && (
          <View style={styles.noTournamentsContainer}>
            <Image source={tournamentIcon} alt="Tournament Icon" style={styles.noTournamentsIcon} />
            <Text style={styles.noTournamentsTitle}>Nessun Torneo Disponibile</Text>
            <Text style={styles.noTournamentsText}>Inizia creando un Torneo!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333',
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  heroSection: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLogo: {
    width: '120%',
    height: 120,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'black',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    textAlign: 'center',
    display: 'none',
  },
  headerLogo: {
    width: '100%',
    height: 100,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: 'transparent',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tournamentsContainer: {
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
    width: Dimensions.get('window').width - 30,
    marginHorizontal: 15,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    padding: 15,
  },
  cardMinimized: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardIcon: {
    height: 50,
    width: 50,
    marginRight: 10,
  },
  cardStatus: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 16,
    color: '#999',
  },
  cardCreatorId: {
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
    marginBottom: 8,
  },
  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  noTournamentsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  noTournamentsIcon: {
    height: 70,
    width: 70,
    marginBottom: 15,
  },
  noTournamentsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noTournamentsText: {
    fontSize: 18,
    color: '#666',
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 15,
    marginLeft: 5,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    width: 160,
    paddingVertical: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  cardMaxPlayers: {
    fontSize: 16,
    color: '#777',
    marginBottom: 5,
  },
  buttonBackground: {
    width: 150,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    marginBottom: 15,
    paddingHorizontal: 10,
    flex: 1,
  },
  searchBar: {
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
  },
  searchBarAndSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  switchLabel: {
    color: 'white',
    marginRight: 10,
  },
});

export default HomeScreen;
