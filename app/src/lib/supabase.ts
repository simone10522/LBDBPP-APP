import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get profile image URL
export const getProfileImageUrl = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_image')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile image:', error);
      return null;
    }

    return data?.profile_image || null;
  } catch (error) {
    console.error('Error fetching profile image:', error);
    return null;
  }
};
