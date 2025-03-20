import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Dimensions, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const TradeCompletedAnimation = ({ route, navigation }) => {
  const { myCardImage, otherCardImage } = route.params;
  const myCardPosition = useRef(new Animated.Value(-100)).current;
  const otherCardPosition = useRef(new Animated.Value(100)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(height)).current;
  const textScale = useRef(new Animated.Value(1)).current;
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(myCardPosition, {
        toValue: 130,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(otherCardPosition, {
        toValue: -130,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 3,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(cardTranslateX, {
          toValue: -width * -0.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ]).start(() => {
        setShowText(true);
        Animated.sequence([
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(textScale, {
            toValue: 1.5,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(textScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          })
        ]).start(() => {
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        });
      });
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.animationContainer}>
        <Animated.Image
          source={{ uri: myCardImage }}
          style={[styles.card, { transform: [{ translateX: myCardPosition }] } ]}
        />
        <Animated.Image
          source={{ uri: otherCardImage }}
          style={[styles.card, { transform: [{ translateX: otherCardPosition }, { scale: cardScale }, { translateX: cardTranslateX }] }]}
        />
      </View>
      {showText && (
        <Animated.Text style={[styles.tradeCompletedText, { transform: [{ translateY: textTranslateY }, { scale: textScale }] }]}>Trade Completed!</Animated.Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  animationContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 100,
    height: 140,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  tradeCompletedText: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    position: 'absolute',
    bottom: 100,
  },
});

export default TradeCompletedAnimation;
