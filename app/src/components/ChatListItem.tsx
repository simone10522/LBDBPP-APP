import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { lightPalette, darkPalette } from '../context/themes';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';
import { Volume2, VolumeX } from 'lucide-react-native';

interface ChatListItemProps {
  chat: {
    user: { id: string; username: string; profile_image: string | null };
    lastMessage: { message_text: string; created_at: string };
    muted?: boolean;
  };
  palette: any; // Add palette prop
  onToggleMute: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, palette, onToggleMute }) => {
  const navigation = useNavigation();

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
      <View style={styles.timeContainer}>
        <Text style={[styles.timestamp, { color: palette.secondaryText }]}>
          {new Date(chat.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <TouchableOpacity onPress={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}>
          {chat.muted ? (
            <VolumeX size={26} color={palette.secondaryText} strokeWidth={2} />
          ) : (
            <Volume2 size={26} color={palette.secondaryText} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
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
    overflow: 'hidden',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 22,
  },
});

export default ChatListItem;
