import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');
  const navigation = useNavigation();

  const handleRegister = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: authData.user.id, username, profile_image: profileImage }]);

        if (profileError) throw profileError;
        navigation.navigate('Home');
      }
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Errore', error.message);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProfileImage(e.target.value);
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://github.com/simone10522/LBDBPP/blob/main/icons/LBDBPP.png?raw=true' }}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Registrati</Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        required
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        required
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        required
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registrati</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginButtonText}>Hai già un account? Accedi</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  logo: {
      width: Dimensions.get('window').width * 0.8,
      height: 100,
      marginBottom: 20,
      resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 20,
  },
  loginButtonText: {
    color: '#4a90e2',
    textDecorationLine: 'underline',
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
});

export default RegisterScreen;
