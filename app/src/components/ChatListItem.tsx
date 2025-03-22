import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';

interface ChatListItemProps {
  chat: {
    user: { id: string; username: string; profile_image: string | null };
    lastMessage: { message_text: string; created_at: string };
  };
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useAuth();
  const palette = isDarkMode ? darkPalette : lightPalette;

  const handlePress = () => {
    navigation.navigate('ChatScreen', { receiverProfile: chat.user });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.container, { backgroundColor: palette.rowBackground, borderColor: palette.borderColor }]}>
      <Avatar imageUrl={chat.user.profile_image} size={50} />
      <View style={styles.chatInfo}>
        <Text style={[styles.username, { color: palette.text }]}>{chat.user.username}</Text>
        <Text style={[styles.lastMessage, { color: palette.secondaryText }]} numberOfLines={1} ellipsizeMode="tail">
          {chat.lastMessage.message_text}
        </Text>
      </View>
      <Text style={[styles.timestamp, { color: palette.secondaryText }]}>
        {new Date(chat.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    // Add ellipsis and numberOfLines for long messages
    overflow: 'hidden',
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 'auto', // Push timestamp to the right
  },
});

export default ChatListItem;
