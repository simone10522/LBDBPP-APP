import { View } from 'react-native';
import * as Device from 'expo-device';
import React, { useState } from 'react';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const iosAdmobBanner = "ca-app-pub-3518274030390186/4042498423";
const androidAdmobBanner = "ca-app-pub-3518274030390186/6859367485";
const productionID = Device.osName === 'Android' ? androidAdmobBanner : iosAdmobBanner;

const Banner = () => {
    // https://dev.to/josie/adding-google-admob-to-expo-apps-2din
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);
  return (
    <View style={{ height: isAdLoaded ? 'auto' : 0 }}>
      <BannerAd
        // It is extremely important to use test IDs as you can be banned/restricted by Google AdMob for inappropriately using real ad banners during testing
        unitId={__DEV__ ? TestIds.BANNER : productionID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        // requestOptions={{
        //   requestNonPersonalizedAdsOnly: true, 
        //   // You can change this setting depending on whether you want to use the permissions tracking we set up in the initializing
        // }}
        onAdLoaded={() => {
          setIsAdLoaded(true);
        }}
      />
    </View >
  );
};

export default Banner;