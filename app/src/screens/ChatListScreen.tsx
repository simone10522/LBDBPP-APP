import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase, getProfileImageUrl } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { lightPalette, darkPalette } from '../context/themes';
import ChatListItem from '../components/ChatListItem';

interface Profile {
  id: string;
  username: string;
  profile_image: string | null;
}

interface Chat {
  user: Profile;
  lastMessage: { message_text: string; created_at: string };
  muted?: boolean;
}

const ChatListScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const { user, isDarkMode } = useAuth();
  const palette = isDarkMode ? darkPalette : lightPalette;
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch messages and mute settings
      const [messagesResponse, muteSettingsResponse] = await Promise.all([
        supabase
          .from('messages')
          .select(`
            id,
            created_at,
            message_text,
            sender_id,
            receiver_id,
            sender_profile:sender_id (id, username, profile_image),
            receiver_profile:receiver_id (id, username, profile_image)
          `)
          .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('chat_settings')
          .select('*')
          .eq('user_id', user?.id)
      ]);

      if (messagesResponse.error) {
        console.error('Error fetching chats:', messagesResponse.error);
        return;
      }

      const muteSettings = new Map(
        (muteSettingsResponse.data || []).map(setting => [setting.other_user_id, setting.muted])
      );

      const chatMap = new Map();
      messagesResponse.data?.forEach(message => {
        const otherUserId = message.sender_id === user?.id ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === user?.id ? message.receiver_profile : message.sender_profile;

        if (!chatMap.has(otherUserId)) {
          chatMap.set(otherUserId, {
            user: otherUser,
            lastMessage: {
              message_text: message.message_text,
              created_at: message.created_at,
            },
            muted: muteSettings.get(otherUserId) || false
          });
        } else {
          const existingChat = chatMap.get(otherUserId)!;
          const currentMessageDate = new Date(message.created_at);
          const existingLastMessageDate = new Date(existingChat.lastMessage.created_at);

          if (currentMessageDate > existingLastMessageDate) {
            chatMap.set(otherUserId, {
              user: otherUser,
              lastMessage: {
                message_text: message.message_text,
                created_at: message.created_at,
              },
              muted: muteSettings.get(otherUserId) || false
            });
          }
        }
      });

      setChats(Array.from(chatMap.values()));
    } catch (err) {
      console.error("Error fetching chats:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const toggleMute = async (chatUserId: string) => {
    try {
      const updatedChats = chats.map(chat => {
        if (chat.user.id === chatUserId) {
          return { ...chat, muted: !chat.muted };
        }
        return chat;
      });
      setChats(updatedChats);
      
      // Persist mute state
      await supabase
        .from('chat_settings')
        .upsert({
          user_id: user?.id,
          other_user_id: chatUserId,
          muted: !chats.find(chat => chat.user.id === chatUserId)?.muted,
          updated_at: new Date().toISOString()
        });

      // Update notification settings in memory
      if (window.notificationSettings) {
        window.notificationSettings.set(chatUserId, {
          muted: !chats.find(chat => chat.user.id === chatUserId)?.muted
        });
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    
    if (text.trim() === '') {
      setFilteredChats(chats);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, profile_image')
        .ilike('username', `%${text}%`)
        .neq('id', user?.id);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      // Combine search results with existing chats
      const searchResults: Chat[] = data.map(profile => ({
        user: profile,
        lastMessage: {
          message_text: '',
          created_at: new Date().toISOString()
        }
      }));

      // Filter existing chats by username
      const filteredExistingChats = chats.filter(chat =>
        chat.user.username.toLowerCase().includes(text.toLowerCase())
      );

      // Combine and deduplicate results
      const combinedResults = [...filteredExistingChats];
      searchResults.forEach(result => {
        if (!combinedResults.some(chat => chat.user.id === result.user.id)) {
          combinedResults.push(result);
        }
      });

      setFilteredChats(combinedResults);
    } catch (err) {
      console.error("Error during search:", err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    setFilteredChats(chats);
  }, [chats]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.searchBarContainer, { backgroundColor: palette.headerBackground }]}>
        <TextInput
          style={[styles.searchInput, { color: palette.text, backgroundColor: palette.inputBackground, borderColor: palette.borderColor }]}
          placeholder="Search chats or users..."
          placeholderTextColor={palette.secondaryText}
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={({ item }) => (
            <ChatListItem 
              chat={item}
              palette={palette}
              onToggleMute={() => toggleMute(item.user.id)}
            />
          )}
          keyExtractor={(item) => item.user.id}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  searchBarContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  searchInput: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 0, // Adjust horizontal padding for full width list items if needed
  },
  chatListContent: {
    paddingVertical: 0, // Adjust vertical padding for list content if needed
  },
});

export default ChatListScreen;
