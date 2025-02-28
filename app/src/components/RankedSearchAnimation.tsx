import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface RankedSearchAnimationProps {
  isDarkMode: boolean;
}

const RankedSearchAnimation: React.FC<RankedSearchAnimationProps> = ({ isDarkMode }) => {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [waves, setWaves] = useState([0, 1, 2]); // Array to manage multiple waves

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: scale.value,
    };
  });

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('profile_image')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile image:', error);
          } else if (data && data.profile_image) {
            setProfileImage(data.profile_image);
          }
        } catch (error) {
          console.error('Error fetching profile image:', error);
        }
      }
    };

    fetchProfileImage();
  }, [user]);

  const waveAnimatedStyles = (index) => useAnimatedStyle(() => {
    const delay = index * 500; // Delay each wave by 500ms
    // Debug: Imposta temporaneamente scale e opacity a valori statici
    const scale = 1; //withDelay(delay, withRepeat(withTiming(3, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));
    const opacity = 1; //withDelay(delay, withRepeat(withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false));

    console.log(`Wave ${index}: scale=${scale}, opacity=${opacity}`); // Debug log

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      {waves.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.wave,
            waveAnimatedStyles(index),
            {
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
            },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.circle,
          animatedStyle,
          {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
          },
        ]}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Added for absolute positioning of waves
  },
  wave: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)', // Default light mode color
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'grey',
  }
});

export default RankedSearchAnimation;
