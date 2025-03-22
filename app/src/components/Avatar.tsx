import React from 'react';
    import { Image, StyleSheet, View } from 'react-native';

    interface AvatarProps {
      imageUrl: string | null;
      size: number;
    }

    const Avatar: React.FC<AvatarProps> = ({ imageUrl, size }) => {
      return (
        <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]} />
          )}
        </View>
      );
    };

    const styles = StyleSheet.create({
      avatarContainer: {
        overflow: 'hidden', // Ensures the image doesn't overflow the rounded border
      },
      avatarImage: {
        width: '100%',
        height: '100%',
      },
      avatarPlaceholder: {
        backgroundColor: '#ddd', // Placeholder color
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    export default Avatar;
