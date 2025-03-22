import React from 'react';
    import { View, Text, StyleSheet } from 'react-native';
    import { lightPalette, darkPalette } from '../context/themes';
    import { useAuth } from '../hooks/useAuth';

    interface MessageBubbleProps {
      message: { sender_id: string; message_text: string; created_at: string };
    }

    const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
      const { userId, isDarkMode } = useAuth();
      const palette = isDarkMode ? darkPalette : lightPalette;
      const isSentMessage = message.sender_id === userId;

      return (
        <View style={[
          styles.bubble,
          isSentMessage ? styles.sentBubble : styles.receivedBubble,
          { backgroundColor: isSentMessage ? palette.primary : palette.cardBackground }
        ]}>
          <Text style={[styles.messageText, { color: isSentMessage ? 'white' : palette.text }]}>{message.message_text}</Text>
          <Text style={[styles.timestamp, { color: isSentMessage ? 'lightgray' : palette.secondaryText }]}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    };

    const styles = StyleSheet.create({
      bubble: {
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '80%',
        alignSelf: 'flex-start',
      },
      sentBubble: {
        alignSelf: 'flex-end',
      },
      receivedBubble: {
        alignSelf: 'flex-start',
      },
      messageText: {
        fontSize: 16,
      },
      timestamp: {
        fontSize: 12,
        marginTop: 5,
        textAlign: 'right',
      },
    });

    export default MessageBubble;
