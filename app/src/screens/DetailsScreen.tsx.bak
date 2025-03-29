import React from 'react';
    import { View, Text, StyleSheet } from 'react-native';
    import { useAuth } from '../hooks/useAuth';

    const DetailsScreen = () => {
      const { isDarkMode } = useAuth();
      const theme = isDarkMode ? require('../context/themes').darkPalette : require('../context/themes').lightPalette;

      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>Details Screen</Text>
        </View>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
      },
    });

    export default DetailsScreen;
