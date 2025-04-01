import React from 'react';
import { View, StyleSheet } from 'react-native';
import Video from 'react-native-video';

const ThreeDCube = () => {
  return (
    <View style={styles.container}>
      <Video
        source={require('../../assets/test.mp4')}
        style={styles.video}
        resizeMode="cover"
        repeat={true}
        playInBackground={false}
        playWhenInactive={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

export default ThreeDCube;