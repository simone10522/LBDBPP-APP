import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';

const LoadingScreen = () => (
  <View style={styles.container}>
    <View style={styles.topBar} />
    <Image source={require('../../assets/splashscreen_log.png')} style={styles.logo} resizeMode="contain" />
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBar} />
    </View>
    <View style={styles.bottomBar} />
    <ActivityIndicator size="large" color="#fff" style={styles.loader} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, backgroundColor: '#222' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#222' },
  logo: { width: 220, height: 220, marginBottom: 0, marginTop: 0 },
  progressBarContainer: { width: 180, height: 10, backgroundColor: '#444', borderRadius: 5, marginTop: 24, marginBottom: 16, overflow: 'hidden' },
  progressBar: { width: '60%', height: '100%', backgroundColor: '#00ff99', borderRadius: 5 },
  loader: { position: 'absolute', bottom: 40 },
});

export default LoadingScreen;