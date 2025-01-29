import React, { useEffect, useState, useCallback, useRef } from 'react';
    import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimensions, Modal } from 'react-native';
    import { useNavigation } from '@react-navigation/native';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';
    import { Card } from 'react-native-elements';

    interface Tournament {
      id: string;
      name: string;
      description: string;
      status: 'draft' | 'in_progress' | 'completed';
      created_at: string;
      created_by: string;
      max_players: number;
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

      const fetchTournaments = useCallback(async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*, profiles!tournaments_created_by_fkey(username)')
            .order('created_at', { ascending: false });

          if (!error && data) {
            console.log("Fetched tournaments:", data);
            const tournamentsWithUsername = data.map((tournament: any) => ({
              ...tournament,
              created_by: tournament.profiles?.username || 'Unknown',
            }));
            setTournaments(tournamentsWithUsername);
          } else {
            console.error("Error fetching tournaments:", error);
            setTournaments([]);
          }
        } catch (error: any) {
          console.error("Error during tournament fetch:", error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      }, []);

      const fetchUserData = async () => {
        if (user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('username, profile_image')
              .eq('id', user.id)
              .single();
            if (error) {
              console.error("Error fetching user data:", error);
              setUsername('Guest');
              setProfileImage('');
            } else {
              setUsername(data?.username || 'Guest');
              setProfileImage(data?.profile_image || '');
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
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

      const onRefresh = React.useCallback(() => {
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
      };

      return (
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.header}>
              <Image
                source={{ uri: 'https://github.com/simone10522/LBDBPP/blob/main/icons/LBDBPP.png?raw=true' }}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateTournament')}>
                  <Text style={styles.createButtonText}>Crea Torneo</Text>
                </TouchableOpacity>
                {!user && (
                  <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginButtonText}>Accedi</Text>
                  </TouchableOpacity>
                )}
                {user && (
                  <View style={styles.userContainer}>
                    {profileImage && (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.profileImage}
                      />
                    )}
                    <TouchableOpacity onPress={toggleDropdown} ref={dropdownRef}>
                      <Text style={styles.username}>{username}</Text>
                    </TouchableOpacity>
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
                        <View style={styles.dropdown}>
                          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.dropdownItem}>
                            <Text>Profile</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
                            <Text>Logout</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  </View>
                )}
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
                  <Card containerStyle={styles.card}>
                    <View style={styles.cardHeader}>
                      <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png' }}
                        alt="Pokeball Icon"
                        style={styles.cardIcon}
                      />
                      <Text style={styles.cardCreatorId}>Creato da: {tournament.created_by}</Text>
                      <Text style={[styles.cardStatus, {
                        backgroundColor: tournament.status === 'completed' ? 'green' : tournament.status === 'in_progress' ? 'rgba(245, 132, 66, 1.0)' : 'gray',
                      }]}>
                        {tournament.status.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.cardTitle}>{tournament.name}</Text>
                    <Text style={styles.cardDescription}>{tournament.description}</Text>
                    <Text style={styles.cardMaxPlayers}>Max Players: {tournament.max_players}</Text>
                    <Text style={styles.cardDate}>Created {new Date(tournament.created_at).toLocaleDateString()}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>

            {tournaments.length === 0 && !loading && (
              <View style={styles.noTournamentsContainer}>
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Pok%C3%A9_Ball_icon.svg/2048px-Pok%C3%A9_Ball_icon.svg.png' }}
                  alt="Pokeball Icon"
                  style={styles.noTournamentsIcon}
                />
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
        backgroundColor: '#4a90e2',
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
        borderRadius: 10,
        marginBottom: 10,
        elevation: 3,
        width: Dimensions.get('window').width - 20,
        marginHorizontal: 10,
      },
      cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      },
      cardIcon: {
        height: 40,
        width: 40,
      },
      cardStatus: {
        padding: 5,
        borderRadius: 5,
        color: 'white',
        fontSize: 14,
      },
      cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
      },
      cardDescription: {
        fontSize: 18,
        color: '#666',
        marginBottom: 5,
      },
      cardDate: {
        fontSize: 14,
        color: '#999',
      },
      cardCreatorId: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        marginBottom: 5,
      },
      error: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
      },
      noTournamentsContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
      },
      noTournamentsIcon: {
        height: 60,
        width: 60,
        marginBottom: 10,
      },
      noTournamentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
      },
      noTournamentsText: {
        fontSize: 16,
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
        marginRight: 5,
      },
      dropdown: {
        position: 'absolute',
        top: 50,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        width: 150,
      },
      dropdownItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
      }
    });

    export default HomeScreen;
