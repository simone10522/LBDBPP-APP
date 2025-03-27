import { useEffect, useRef, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

interface InterstitialAdProps {
  onAdClosed?: () => void;
  onAdFailedToLoad?: (error: any) => void;
}

const InterstitialAdComponent = ({ onAdClosed, onAdFailedToLoad }: InterstitialAdProps) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3518274030390186/5450195783';

  const interstitialAd = useRef(
    InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['trading card game', 'games', 'cards'],
    })
  ).current;

  useEffect(() => {
    const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Ad loaded, attempting to show...');
      setAdLoaded(true);
      try {
        if (interstitialAd.loaded) {
          interstitialAd.show().catch(error => {
            console.error('Error showing ad:', error);
            onAdFailedToLoad?.(error);
          });
        }
      } catch (error) {
        console.error('Error in show attempt:', error);
        onAdFailedToLoad?.(error);
      }
    });

    const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Ad closed');
      onAdClosed?.();
    });

    const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Ad error:', error);
      onAdFailedToLoad?.(error);
    });

    console.log('Loading interstitial ad...');
    interstitialAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  return null;
};

export default InterstitialAdComponent;
