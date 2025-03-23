import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface BannerAdProps {
  adUnitID: string;
  bannerSize?: BannerAdSize;
  onAdLoadFailed?: (error: any) => void;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({ adUnitID, bannerSize = BannerAdSize.BANNER, onAdLoadFailed }) => {
  const isTesting = __DEV__;
  const currentAdId = isTesting ? TestIds.BANNER : adUnitID;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={currentAdId}
        size={bannerSize}
        onAdFailedToLoad={onAdLoadFailed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222', // Or any background color that matches your app's theme
    paddingVertical: 10,
  },
});

export default BannerAdComponent;
