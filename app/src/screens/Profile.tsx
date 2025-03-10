import React from 'react';
    import { View, Text, StyleSheet } from 'react-native';

    const Profile = () => {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Profile Screen</Text>
        </View>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
      text: {
        fontSize: 24,
        fontWeight: 'bold',
      },
    });

    export default Profile;
