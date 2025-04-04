import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { lightPalette, darkPalette } from '../context/themes'; // Importa i temi
import { useAuth } from '../hooks/useAuth'; // Importa useAuth
import messaging from '@react-native-firebase/messaging';
import { Ionicons } from '@expo/vector-icons'; // Aggiungi questo import

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Aggiungi questo state
  const navigation = useNavigation();
  const { isDarkMode } = useAuth(); // Usa isDarkMode dal contesto
  const theme = isDarkMode ? darkPalette : lightPalette; // Determina il tema corrente

  const getFCMToken = async () => {
    try {
      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  };

  const handleRegister = async () => {
    try {
      if (!email || !password || !username) {
        setError('Tutti i campi sono obbligatori');
        return;
      }

      // Step 1: Registrazione utente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Step 2: Ottieni token FCM
        const fcmToken = await getFCMToken();
        console.log('Step 2 - Got FCM token:', fcmToken);

        // Step 3: Crea profilo utente
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: authData.user.id, 
            username, 
            profile_image: profileImage,
            push_token: fcmToken 
          });

        if (insertError) {
          console.error('Step 3 - Profile creation error:', insertError);
          throw insertError;
        }

        console.log('Registration completed successfully');

        // Verifica che il profilo sia stato effettivamente creato
        let profileVerified = false;
        let attempts = 0;
        
        while (!profileVerified && attempts < 5) {
          attempts++;
          
          // Attendi 500ms tra ogni tentativo
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          if (profileData && !profileError) {
            console.log('Profile verification successful');
            profileVerified = true;
            
            // Naviga alla schermata del profilo passando i dati utente
            navigation.navigate('Profile', { 
              userId: authData.user.id,
              userData: profileData,
              freshRegistration: true
            });
            break;
          }
          
          console.log(`Profile verification attempt ${attempts} failed`);
        }
        
        if (!profileVerified) {
          console.warn('Could not verify profile after multiple attempts');
          // Naviga comunque alla schermata profilo anche se la verifica fallisce
          navigation.navigate('Profile', { 
            userId: authData.user.id,
            freshRegistration: true
          });
        }
      }
    } catch (error: any) {
      console.log('Registration error:', error);
      const errorMessage = error.message || 'Si è verificato un errore durante la registrazione';
      setError(errorMessage);
      Alert.alert('Errore', errorMessage);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProfileImage(e.target.value);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        placeholder="Username"
        placeholderTextColor={theme.secondaryText}
        value={username}
        onChangeText={setUsername}
        required
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
        placeholder="Email"
        placeholderTextColor={theme.secondaryText}
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
          placeholderTextColor={theme.secondaryText}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          required
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.buttonBackground }]} onPress={handleRegister}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.loginButtonText, { color: theme.buttonBackground }]}>Already have an account? Log in</Text>
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
  },
  logo: {
    width: Dimensions.get('window').width * 1.0,
    height: 200,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
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
    fontSize: 16,
    textAlign: 'center',
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
});

export default RegisterScreen;
