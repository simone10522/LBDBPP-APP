import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Switch, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { lightPalette, darkPalette } from '../context/themes';
//import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import BannerAdComponent from '../components/BannerAd';

const ProfileScreen = () => {
  const { user, setUser, isDarkMode, setIsDarkMode } = useAuth();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [matchPassword, setMatchPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const [pushTokenEnabled, setPushTokenEnabled] = useState(false); // New state for push token switch

  const theme = isDarkMode ? darkPalette : lightPalette;

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (user) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, profile_image, match_password')
          .eq('id', user.id)
          .single();

        if (error) {
          setError(error.message);
        } else if (data) {
          setUsername(data.username || '');
          setProfileImage(data.profile_image || '');
          setMatchPassword(data.match_password || '');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username, profile_image: profileImage, match_password: matchPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        setError(updateError.message);
      } else {
        // Use a more subtle notification
        alert('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error("Error during profile update:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear push_token before logging out
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error clearing push_token:", updateError);
        setError(updateError.message);
      } else {
        console.log("push_token cleared successfully");
        // Proceed with logout after successful push_token removal
        await supabase.auth.signOut();
        setUser(null);
        navigation.navigate('Login');
      }
    } catch (error: any) {
      console.error("Error during logout:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const goToDecklistscreen = () => {
    navigation.navigate('Decklistscreen');
  };

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });
    } else {
      alert('Must use physical device for Push Notifications');
      return null;
    }

    return token?.data;
  }

  const handlePushTokenToggle = async (value: boolean) => {
    setLoading(true);
    setError(null);

    try {
      if (value) {
        // Enable push token
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ push_token: pushToken })
            .eq('id', user.id);

          if (updateError) {
            console.error("Error updating push token:", updateError);
            setError(updateError.message);
            alert('Failed to enable push token.');
          } else {
            console.log("Push token enabled successfully");
            alert('Push token enabled successfully!');
          }
        } else {
          alert('Failed to get push token.');
        }
      } else {
        // Disable push token
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ push_token: null })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error disabling push token:", updateError);
          setError(updateError.message);
          alert('Failed to disable push token.');
        } else {
          console.log("Push token disabled successfully");
          alert('Push token disabled successfully!');
        }
      }
      setPushTokenEnabled(value);
    } catch (error: any) {
      console.error("Error during push token toggle:", error);
      setError(error.message);
      alert('An error occurred while toggling push notifications.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../assets/cards/PA.json')} // Use a placeholder
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor={theme.placeholderText}
            accessibilityLabel="Username Input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Avatar URL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
            value={profileImage}
            onChangeText={setProfileImage}
            placeholder="Enter avatar URL"
            placeholderTextColor={theme.placeholderText}
            accessibilityLabel="Avatar URL Input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Friend Code</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
            value={matchPassword}
            onChangeText={setMatchPassword}
            placeholder="Enter friend code"
            placeholderTextColor={theme.placeholderText}
            accessibilityLabel="Friend Code Input"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Dark Mode</Text>
          <Switch
            trackColor={{ false: theme.switchTrackFalse, true: theme.switchTrackTrue }}
            thumbColor={isDarkMode ? theme.switchThumbTrue : theme.switchThumbFalse}
            onValueChange={toggleTheme}
            value={isDarkMode}
            accessibilityLabel="Dark Mode Switch"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.buttonBackground }]}
          onPress={goToDecklistscreen}
          accessibilityLabel="Go to My Deck"
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>My Deck</Text>
        </TouchableOpacity>

        <View style={styles.bannerAdContainer}>
          <BannerAdComponent />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.buttonBackground }]}
            onPress={handleSaveProfile}
            disabled={loading}
            accessibilityLabel="Save Profile"
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>{loading ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.error }]}
            onPress={handleLogout}
            accessibilityLabel="Logout"
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff', // Or any color from your theme
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    marginTop: 20,
  },
});

export default ProfileScreen;
