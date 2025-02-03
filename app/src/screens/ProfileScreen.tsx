import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (user) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, profile_image')
          .eq('id', user.id)
          .single();

        console.log("Profile data:", data);
        console.log("Profile error:", error);

        if (error) {
          setError(error.message);
        } else if (data) {
          setUsername(data.username || '');
          setProfileImage(data.profile_image || '');
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

    console.log("Saving profile with username:", username, "and profileImage:", profileImage);
    console.log("Current profileImage value:", profileImage);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username, profile_image: profileImage }) // <-- Aggiunto profile_image all'update
        .eq('id', user.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        setError(updateError.message);
      } else {
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

    console.log(result);

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Settings</Text>

      {loading ? (
        <Text style={styles.text}>Loading profile...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.profileSection}>
            {profileImage && (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 150, height: 150, borderRadius: 75 }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Avatar URL</Text>
            <TextInput
              style={styles.input}
              value={profileImage}
              onChangeText={setProfileImage}
              placeholder="Enter avatar URL"
              placeholderTextColor="#aaa"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  profileSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#444',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;
