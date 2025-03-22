import React from 'react';
    import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
    import { useNavigation } from '@react-navigation/native';
    import { lightPalette, darkPalette } from '../context/themes';
    import { useAuth } from '../hooks/useAuth';
    import Avatar from './Avatar';

    interface UserListItemProps {
      user: { id: string; username: string; profile_image: string | null };
    }

    const UserListItem: React.FC<UserListItemProps> = ({ user }) => {
      const navigation = useNavigation();
      const { isDarkMode } = useAuth();
      const palette = isDarkMode ? darkPalette : lightPalette;

      const handlePress = () => {
        navigation.navigate('ChatScreen', { receiverProfile: user });
      };

      return (
        <TouchableOpacity onPress={handlePress} style={[styles.container, { backgroundColor: palette.rowBackground, borderColor: palette.borderColor }]}>
          <Avatar imageUrl={user.profile_image} size={40} />
          <Text style={[styles.username, { color: palette.text }]}>{user.username}</Text>
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
      username: {
        marginLeft: 10,
        fontSize: 16,
      },
    });

    export default UserListItem;
