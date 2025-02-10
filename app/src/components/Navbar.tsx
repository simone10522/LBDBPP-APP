import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/_useAuth';

const Navbar = () => {
  const navigation = useNavigation();
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigation.navigate('Home');
  };

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.logoContainer}>
        <Image
          source={{ uri: 'https://github.com/simone10522/LBDBPP/blob/main/icons/pokeball.png?raw=true' }}
          style={styles.logo}
        />
        <Image
          source={{ uri: 'https://github.com/simone10522/LBDBPP/blob/main/icons/LBDBPP.png?raw=true' }}
          style={styles.logoText}
        />
      </TouchableOpacity>
      <View style={styles.rightContainer}>
        {user ? (
          <View style={styles.userContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.username}>Ciao! {username}</Text>
            </TouchableOpacity>
            {profileImage && (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            )}
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logoutButton}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.authContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButton}>Accedi</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerButton}>Registrati</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 5,
  },
  logoText: {
    height: 35,
    width: 100,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 5, // Changed marginRight to marginLeft
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
  },
  logoutButton: {
    color: 'white',
    marginLeft: 10,
  },
  authContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButton: {
    color: 'white',
    marginRight: 10,
  },
  registerButton: {
    backgroundColor: '#4a90e2',
    color: 'white',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
});

export default Navbar;
