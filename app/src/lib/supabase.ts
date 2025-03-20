import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey;

console.log("Supabase URL:", supabaseUrl); // ADDED LOG
console.log("Supabase Key:", supabaseKey); // ADDED LOG

export const supabase = createClient(supabaseUrl, supabaseKey);
