import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, Animated, Dimensions, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/_useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { setUser } = useAuth();
  const screenHeight = Dimensions.get('window').height;
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Add a console log to confirm the screen is rendered
    console.log("LoginScreen rendered");

  }, [fadeAnim]);

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        Alert.alert('Errore', error.message);
      } else {
        setUser(data.user);
        navigation.navigate('Home');
      }
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Errore', error.message);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const lightPalette = {
    background: '#FFFFFF',
    text: '#000000',
    inputBackground: '#F0F0F0',
    buttonBackground: '#5DADE2',
    buttonText: '#FFFFFF',
    error: '#FF0000',
    borderColor: '#CCCCCC',
  };

  const darkPalette = {
    background: '#121212',
    text: '#FFFFFF',
    inputBackground: '#333333',
    buttonBackground: '#4a90e2',
    buttonText: '#FFFFFF',
    error: '#FF0000',
    borderColor: '#555555',
  };

  const theme = isDarkMode ? darkPalette : lightPalette;

  return (
    <Animated.View style={[styles.container, {
      opacity: fadeAnim,
      transform: [{
        translateX: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [screenHeight, 0],
        }),
      }],
      backgroundColor: theme.background,
    }]}>
      <View style={styles.switchContainer}>
        <Text style={{ color: theme.text }}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleTheme}
          value={isDarkMode}
        />
      </View>
      <Image
        source={require('../../assets/homelogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: theme.text }]}>Accedi</Text>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
        placeholder="Email"
        placeholderTextColor="#AAAAAA"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        required
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
        placeholder="Password"
        placeholderTextColor="#AAAAAA"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        required
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handleLogin}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Accedi</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.registerButtonText, { color: theme.buttonBackground }]}>Hai già un account? Registrati</Text>
      </TouchableOpacity>
    </Animated.View>
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
  switchContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  registerButton: {
    marginTop: 20,
  },
  registerButtonText: {
    color: '#4a90e2',
    textDecorationLine: 'underline',
  },
  error: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
});
