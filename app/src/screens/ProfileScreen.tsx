import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch, ActivityIndicator, ScrollView, Alert, RefreshControl, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { lightPalette, darkPalette } from '../context/themes';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import BannerAdComponent from '../components/BannerAd';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, Entypo } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const ProfileScreen = () => {
  const { user, setUser, isDarkMode, setIsDarkMode } = useAuth();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [matchPassword, setMatchPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const [pushTokenEnabled, setPushTokenEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: updateError.message
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile updated successfully!'
        });
      }
    } catch (error: any) {
      console.error("Error during profile update:", error);
      setError(error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadToImgur = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID f6e26633ee3ad93',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          type: 'base64'
        })
      });

      console.log('Imgur Response Status:', response.status);
      const responseText = await response.text();
      console.log('Imgur Raw Response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      if (data.success) {
        return data.data.link;
      } else {
        throw new Error(data.data?.error || 'Imgur upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Imgur:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  };

  const convertToWebP = async (uri: string): Promise<string> => {
    const fileExtension = uri.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'gif') {
      return uri;
    }

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 500, height: 500 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
    );

    return result.uri;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission needed',
          text2: 'Please grant camera roll permissions to upload a profile picture.'
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          const uri = result.assets[0].uri;
          console.log("Selected image URI:", uri);
          
          const optimizedUri = await convertToWebP(uri);
          console.log("Optimized image URI:", optimizedUri);
          
          const fileInfo = await FileSystem.getInfoAsync(optimizedUri);
          if (!fileInfo.exists) {
            throw new Error('File does not exist');
          }
          
          const imgurUrl = await uploadToImgur(optimizedUri);
          console.log("Imgur URL:", imgurUrl);
          
          setProfileImage(imgurUrl);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_image: imgurUrl })
            .eq('id', user.id);

          if (updateError) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to update profile image'
            });
          } else {
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Profile image updated successfully'
            });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to upload image. Please try again.'
          });
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image. Please try again.'
      });
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id);

      if (updateError) {
        console.error("Error clearing push_token:", updateError);
        setError(updateError.message);
      } else {
        console.log("push_token cleared successfully");
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to get push token for push notification!'
        });
        return null;
      }
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Must use physical device for Push Notifications'
      });
      return null;
    }

    return token?.data;
  }

  const handlePushTokenToggle = async (value: boolean) => {
    setLoading(true);
    setError(null);

    try {
      if (value) {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ push_token: pushToken })
            .eq('id', user.id);

          if (updateError) {
            console.error("Error updating push token:", updateError);
            setError(updateError.message);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to enable push token.'
            });
          } else {
            console.log("Push token enabled successfully");
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Push token enabled successfully!'
            });
          }
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to get push token.'
          });
        }
      } else {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ push_token: null })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error disabling push token:", updateError);
          setError(updateError.message);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to disable push token.'
          });
        } else {
          console.log("Push token disabled successfully");
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Push token disabled successfully!'
          });
        }
      }
      setPushTokenEnabled(value);
    } catch (error: any) {
      console.error("Error during push token toggle:", error);
      setError(error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while toggling push notifications.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image: urlInput })
        .eq('id', user.id);

      if (updateError) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update profile image'
        });
      } else {
        setProfileImage(urlInput);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile image updated successfully'
        });
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile image'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Enter Image URL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="Enter image URL"
              placeholderTextColor={theme.placeholderText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonBackground, flex: 1, marginRight: 10 }]}
                onPress={handleUrlSubmit}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.error, flex: 1, marginLeft: 10 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <View style={styles.buttonOverlay}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(true)}>
                <Entypo name="dots-three-horizontal" size={18} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                <Ionicons name="folder-outline" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View>
              <Image
                source={profileImage ? { uri: profileImage } : require('../../assets/pokemon_hero_bg.png')}
                style={styles.avatar}
                resizeMode="cover"
                defaultSource={require('../../assets/pokemon_hero_bg.png')}
              />
            </View>
          </View>
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
      <Toast />
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
    width: '100%',
    position: 'relative',
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 120,
  },
  buttonOverlay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    position: 'absolute',
    top: 90,
    zIndex: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(92, 92, 92, 0.8)',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default ProfileScreen;
