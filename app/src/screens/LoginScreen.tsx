import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, Animated, Dimensions, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightPalette, darkPalette } from '../context/themes'; // Import theme palettes
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for the eye icon

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { setUser, isDarkMode, setIsDarkMode } = useAuth(); // Use global state
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
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

  const toggleTheme = async () => {
    try {
        const newIsDarkMode = !isDarkMode;
        setIsDarkMode(newIsDarkMode);
        await AsyncStorage.setItem('isDarkMode', JSON.stringify(newIsDarkMode));
    } catch (error) {
      console.error('Failed to save theme to AsyncStorage', error);
    }
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
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
          placeholder="Password"
          placeholderTextColor="#AAAAAA"
          secureTextEntry={!showPassword} // Toggle secureTextEntry based on showPassword
          value={password}
          onChangeText={setPassword}
          required
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handleLogin}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.registerButtonText, { color: theme.primary }]}>Don't have an account yet? Register now!</Text>
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
    width: Dimensions.get('window').width * 1,
    height: 200,
    marginBottom: 10,
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
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 10,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
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
