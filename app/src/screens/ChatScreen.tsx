import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import { Send } from 'lucide-react-native';
import { supabase, getProfileImageUrl } from '../lib/supabase';
import MessageBubble from '../components/MessageBubble';
import Avatar from '../components/Avatar';
import BannerAdComponent from '../components/BannerAd';
import { appEvents, EVENTS } from '../utils/eventEmitter';

// Utility function to enlarge emojis
const enlargeEmojis = (text: string) => {
  // Regex to match emoji characters
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;

  // Split text into parts (emojis and non-emojis)
  const parts = text.split(emojiRegex);
  const emojis = text.match(emojiRegex) || [];
  
  // Combine parts with styled emojis
  let result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(<Text key={`text-${i}`}>{parts[i]}</Text>);
    if (emojis[i]) result.push(
      <Text key={`emoji-${i}`} style={styles.emoji}>
        {emojis[i]}
      </Text>
    );
  }
  return result;
};

const ChatScreen = () => {
  const route = useRoute();
  const { receiverProfile } = route.params as { receiverProfile: { username: string, id: string, profile_image: string | null } };
  const { isDarkMode, user } = useAuth();
  const palette = isDarkMode ? darkPalette : lightPalette;
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<{ id: string; sender_id: string; receiver_id: string; message_text: string; created_at: string; read: boolean; }[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiverImage, setReceiverImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Mark messages as read when opening the chat
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', receiverProfile.id);

      // Emit event to refresh notifications badge
      appEvents.emit(EVENTS.REFRESH_NOTIFICATIONS);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},sender_id.eq.${receiverProfile.id}`)
        .or(`receiver_id.eq.${user.id},receiver_id.eq.${receiverProfile.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        Alert.alert("Error", "Failed to fetch messages.");
        return;
      }

      if (data) {
        // Filter the messages to only include conversations between these two users
        const filteredData = data.filter(message => 
          (message.sender_id === user.id && message.receiver_id === receiverProfile.id) ||
          (message.sender_id === receiverProfile.id && message.receiver_id === user.id)
        );
        setMessages(filteredData);
      }
    } catch (error) {
      console.error("Error during fetching messages:", error);
      Alert.alert("Error", "An unexpected error occurred while fetching messages.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, receiverProfile.id]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase.channel('public:messages');

    const subscription = channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMessage = payload.new as { id: string; sender_id: string; receiver_id: string; message_text: string; created_at: string; read: boolean; };
        if ((newMessage.sender_id === user?.id && newMessage.receiver_id === receiverProfile.id) ||
            (newMessage.sender_id === receiverProfile.id && newMessage.receiver_id === user?.id)) {
          setMessages(prevMessages => [...prevMessages, newMessage]);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, receiverProfile.id, fetchMessages]);

  useEffect(() => {
    // Fetch receiver's profile image
    const fetchImage = async () => {
      const imageUrl = receiverProfile.profile_image ?? await getProfileImageUrl(receiverProfile.id);
      setReceiverImage(imageUrl);
    };

    fetchImage();
  }, [receiverProfile.id, receiverProfile.profile_image]);

  useEffect(() => {
    // Scroll to the bottom when messages change
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (messageText.trim() !== '') {
      if (!user?.id) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      try {
        const { error } = await supabase
          .from('messages')
          .insert([
            {
              sender_id: user.id,
              receiver_id: receiverProfile.id,
              message_text: messageText,
              read: false, // Add this line to set initial read status
            },
          ]);

        if (error) {
          console.error("Error sending message:", error);
          Alert.alert("Error", "Failed to send message. Please try again.");
          return;
        }

        // Recupera il profilo del destinatario con status e push token
        const { data: receiverData, error: receiverError } = await supabase
          .from('profiles')
          .select('push_token, status, username')
          .eq('id', receiverProfile.id)
          .single();

        if (receiverError) {
          console.error("Error fetching receiver's data:", receiverError);
        } else if (receiverData?.push_token && receiverData.status === 'offline') {
          // Invia la notifica solo se l'utente è offline
          try {
            const { data: senderData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', user.id)
              .single();

            const response = await fetch('https://lbdb-server-production.up.railway.app/send-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pushToken: receiverData.push_token,
                title: `Nuovo messaggio da ${senderData.username}`,
                message: messageText,
                userId: receiverProfile.id,
                notificationType: 'chat'
              }),
            });

            if (!response.ok) {
              console.error("Failed to send notification:", await response.text());
            }
          } catch (notificationError) {
            console.error("Error sending notification:", notificationError);
          }
        }

        setMessageText('');
      } catch (error) {
        console.error("Error during message sending:", error);
        Alert.alert("Error", "An unexpected error occurred while sending the message.");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.headerBackground, borderBottomColor: palette.borderColor }]}>
        <Avatar imageUrl={receiverImage} size={40} />
        <Text style={[styles.headerText, { color: palette.text, marginLeft: 10 }]}>Chat with {receiverProfile?.username}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} style={styles.loadingIndicator} />
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <MessageBubble
                message={{
                  ...item,
                  message_text: <Text>{enlargeEmojis(item.message_text)}</Text>
                }}
              />
            )}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
          />
        </View>
      )}
      <View style={[styles.inputContainer, { backgroundColor: palette.inputBackground, borderTopColor: palette.borderColor }]}>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.borderColor }]}
          placeholder="Write a message..."
          placeholderTextColor={palette.secondaryText}
          value={messageText}
          onChangeText={setMessageText}
          multiline={true}
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Send color={palette.primary} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 10,
    paddingBottom: 60, // Spazio per il banner
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  emoji: {
    fontSize: 44, // Customize this value to adjust emoji size
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
});

export default ChatScreen;
