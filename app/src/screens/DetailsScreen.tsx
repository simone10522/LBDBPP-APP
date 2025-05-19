import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const DetailsScreen = () => {
  const { isDarkMode } = useAuth();
  const theme = isDarkMode ? require('../context/themes').darkPalette : require('../context/themes').lightPalette;
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('detailsScreen.title')}</Text>
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
