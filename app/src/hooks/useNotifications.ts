import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useNotifications = () => {
  useEffect(() => {
    const subscription = supabase
      .from('messages')
      .on('INSERT', handleNewMessage)
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, []);

  const handleNewMessage = async (payload: any) => {
    const senderId = payload.new.sender_id;

    // Check if sender is muted
    const isMuted = window.notificationSettings?.get(senderId)?.muted;
    if (isMuted) {
      return; // Skip notification if sender is muted
    }

    // Logic to handle notification silently
    const messageText = payload.new.message_text;
    const senderProfile = await supabase
      .from('profiles')
      .select('username, profile_image')
      .eq('id', senderId)
      .single();

    if (senderProfile.data) {
      const { username, profile_image } = senderProfile.data;
      // Handle notification silently
    }
  };
};