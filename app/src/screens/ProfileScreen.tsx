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
import * as Notifications from 'expo-notifications';
import BannerAdComponent from '../components/BannerAd';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, Entypo } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [friendCodeError, setFriendCodeError] = useState('');
  const { t, i18n } = useTranslation();
  const [langMenuVisible, setLangMenuVisible] = useState(false);

  const theme = isDarkMode ? darkPalette : lightPalette;

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (user) {
      setLoading(true);
      try {
        const { data: existingProfile, error: selectError } = await supabase
          .from('profiles')
          .select('username, profile_image, match_password')
          .eq('id', user.id)
          .single();

        if (selectError && selectError.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              username: 'New User',
              profile_image: '',
              match_password: ''
            }])
            .select()
            .single();

          if (insertError) {
            console.error("Error creating profile:", insertError);
            setError("Failed to create profile");
          } else if (newProfile) {
            setUsername(newProfile.username);
            setProfileImage(newProfile.profile_image || '');
            setMatchPassword(newProfile.match_password || '');
          }
        } else if (existingProfile) {
          setUsername(existingProfile.username || '');
          setProfileImage(existingProfile.profile_image || '');
          setMatchPassword(existingProfile.match_password || '');
        }
      } catch (error: any) {
        console.error("Profile fetch error:", error);
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

  const validateFriendCode = (code: string) => {
    const numbersOnly = code.replace(/[^\d]/g, '');
    if (numbersOnly.length !== 16) {
      setFriendCodeError(t('profile.friendCodeError'));
      return false;
    }
    setFriendCodeError('');
    return true;
  };

  const handleSaveProfile = async () => {
    if (matchPassword && !validateFriendCode(matchPassword)) {
      Toast.show({
        type: 'error',
        text1: t('profile.invalidFriendCode'),
        text2: t('profile.friendCodeError')
      });
      return;
    }

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
          text1: t('profile.error'),
          text2: updateError.message
        });
      } else {
        Toast.show({
          type: 'success',
          text1: t('profile.success'),
          text2: t('profile.profileUpdated')
        });
      }
    } catch (error: any) {
      console.error("Error during profile update:", error);
      setError(error.message);
      Toast.show({
        type: 'error',
        text1: t('profile.error'),
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadToImgBB = async (uri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append('key', 'e60c591379968734c3c87ebe57eddcea');
      formData.append('image', base64);

      const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('ImgBB Response Status:', uploadResponse.status);
      const responseData = await uploadResponse.json();
      console.log('ImgBB Response:', responseData);

      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }

      if (responseData.success) {
        return responseData.data.url;
      } else {
        throw new Error(responseData.error?.message || t('profile.imgBBUploadFailed'));
      }
    } catch (error) {
      console.error('Error uploading to ImgBB:', error);
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
          text1: t('profile.permissionNeeded'),
          text2: t('profile.cameraRollPermission')
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
            throw new Error(t('profile.fileNotExist'));
          }
          
          const imageUrl = await uploadToImgBB(optimizedUri);
          console.log("ImgBB URL:", imageUrl);
          
          setProfileImage(imageUrl);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_image: imageUrl })
            .eq('id', user.id);

          if (updateError) {
            Toast.show({
              type: 'error',
              text1: t('profile.error'),
              text2: t('profile.updateImageFailed')
            });
          } else {
            Toast.show({
              type: 'success',
              text1: t('profile.success'),
              text2: t('profile.imageUpdated')
            });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Toast.show({
            type: 'error',
            text1: t('profile.error'),
            text2: t('profile.uploadImageFailed')
          });
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: t('profile.error'),
        text2: t('profile.pickImageFailed')
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
          text1: t('profile.error'),
          text2: t('profile.pushTokenFailed')
        });
        return null;
      }
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: t('profile.error'),
        text2: t('profile.physicalDeviceRequired')
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
              text1: t('profile.error'),
              text2: t('profile.enablePushTokenFailed')
            });
          } else {
            console.log("Push token enabled successfully");
            Toast.show({
              type: 'success',
              text1: t('profile.success'),
              text2: t('profile.pushTokenEnabled')
            });
          }
        } else {
          Toast.show({
            type: 'error',
            text1: t('profile.error'),
            text2: t('profile.pushTokenFailed')
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
            text1: t('profile.error'),
            text2: t('profile.disablePushTokenFailed')
          });
        } else {
          console.log("Push token disabled successfully");
          Toast.show({
            type: 'success',
            text1: t('profile.success'),
            text2: t('profile.pushTokenDisabled')
          });
        }
      }
      setPushTokenEnabled(value);
    } catch (error: any) {
      console.error("Error during push token toggle:", error);
      setError(error.message);
      Toast.show({
        type: 'error',
        text1: t('profile.error'),
        text2: t('profile.pushTokenToggleError')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setModalVisible(false);
      return;
    }
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image: urlInput })
        .eq('id', user.id);

      if (updateError) {
        Toast.show({
          type: 'error',
          text1: t('profile.error'),
          text2: t('profile.updateImageFailed')
        });
      } else {
        setProfileImage(urlInput);
        Toast.show({
          type: 'success',
          text1: t('profile.success'),
          text2: t('profile.imageUpdated')
        });
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Toast.show({
        type: 'error',
        text1: t('profile.error'),
        text2: t('profile.updateImageFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'it' : 'en';
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('appLanguage', newLang);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={toggleLanguage}
        accessibilityLabel={t('profile.languageMenu')}
      >
        <Text style={{ color: theme.text }}>{i18n.language === 'en' ? 'IT' : 'EN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setLangMenuVisible(true)}
        accessibilityLabel={t('profile.openLanguageMenu')}
      >
        <Ionicons name="menu" size={28} color={theme.text} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={langMenuVisible}
        onRequestClose={() => setLangMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.sideMenuOverlay}
          activeOpacity={1}
          onPressOut={() => setLangMenuVisible(false)}
        >
          <View style={[styles.sideMenu, { backgroundColor: theme.background }]}>
            <Text style={[styles.sideMenuTitle, { color: theme.text }]}>{t('profile.selectLanguage')}</Text>
            <TouchableOpacity
              style={styles.langButton}
              onPress={() => { i18n.changeLanguage('it'); setLangMenuVisible(false); }}
            >
              <Text style={{ color: theme.text }}>Italiano</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.langButton}
              onPress={() => { i18n.changeLanguage('en'); setLangMenuVisible(false); }}
            >
              <Text style={{ color: theme.text }}>English</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('profile.enterImageUrl')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder={t('profile.enterImageUrl')}
              placeholderTextColor={theme.placeholderText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonBackground, flex: 1, marginRight: 10 }]}
                onPress={handleUrlSubmit}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('profile.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.error, flex: 1, marginLeft: 10 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('profile.cancel')}</Text>
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
          <Text style={[styles.label, { color: theme.text }]}>{t('profile.username')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('profile.enterUsername')}
            placeholderTextColor={theme.placeholderText}
            accessibilityLabel={t('profile.usernameInput')}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t('profile.friendCode')}</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.inputBackground, color: theme.text, borderColor: friendCodeError ? theme.error : theme.inputBorder }
            ]}
            value={matchPassword}
            onChangeText={(text) => {
              const numbersOnly = text.replace(/[^\d]/g, '');
              if (numbersOnly.length <= 16) {
                setMatchPassword(numbersOnly);
                validateFriendCode(numbersOnly);
              }
            }}
            placeholder={t('profile.enterFriendCode')}
            placeholderTextColor={theme.placeholderText}
            keyboardType="numeric"
            maxLength={16}
            accessibilityLabel={t('profile.friendCodeInput')}
          />
          {friendCodeError ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{friendCodeError}</Text>
          ) : null}
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.label, { color: theme.text }]}>{t('profile.darkMode')}</Text>
          <Switch
            trackColor={{ false: theme.switchTrackFalse, true: theme.switchTrackTrue }}
            thumbColor={isDarkMode ? theme.switchThumbTrue : theme.switchThumbFalse}
            onValueChange={toggleTheme}
            value={isDarkMode}
            accessibilityLabel={t('profile.darkModeSwitch')}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.buttonBackground }]}
          onPress={goToDecklistscreen}
          accessibilityLabel={t('profile.goToMyDeck')}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('profile.myDeck')}</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.buttonBackground }]}
            onPress={handleSaveProfile}
            disabled={loading}
            accessibilityLabel={t('profile.saveProfile')}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              {loading ? t('profile.savingProfile') : t('profile.saveProfile')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.error }]}
            onPress={handleLogout}
            accessibilityLabel={t('profile.logout')}
          >
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.bannerAdContainer}>
        <BannerAdComponent />
      </View>
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
    fontSize: 12,
    marginTop: 5,
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
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
  menuButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: 'rgba(92,92,92,0.8)',
    borderRadius: 25,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideMenuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sideMenu: {
    width: 220,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 0 },
  },
  sideMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  langButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
});

export default ProfileScreen;
