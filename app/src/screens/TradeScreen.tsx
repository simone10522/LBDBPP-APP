import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Animated, Easing, Switch, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import TradeCardSelection from '../components/TradeCardSelection';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import A1 from '../../assets/cards/modified/A1.json';
import A2 from '../../assets/cards/modified/A2.json';
import A1a from '../../assets/cards/modified/A1a.json';
import A2a from '../../assets/cards/modified/A2a.json';
import A2b from '../../assets/cards/modified/A2b.json';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Accordion from '../components/Accordion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import BannerAdComponent from '../components/BannerAd';
import Toast from 'react-native-toast-message';
import InterstitialAdComponent from '../components/InterstitialAd';

const loadCardData = () => {
  const allCards = {};
  [A1, A2, A1a, A2a, A2b].forEach(set => {
    set.forEach(card => {
      allCards[card.id] = card;
    });
  });
  return allCards;
};

const allCardData = loadCardData();

const getCardImage = (cardId: string) => {
  const card = allCardData[cardId];
  if (card) {
    return card.image + '/low.webp';
  }
  return null;
};

const getCardName = (cardId: string) => {
  const card = allCardData[cardId];
  if (card) {
    return card.name;
  }
  return 'Unknown Card';
};

const groupTradesByOtherUser = (trades, userId) => {
  const grouped = {};
  trades.forEach(trade => {
    const otherUserId = trade.user1_id === userId ? trade.user2_id : trade.user1_id;
    if (!grouped[otherUserId]) grouped[otherUserId] = [];
    grouped[otherUserId].push(trade);
  });
  return grouped;
};

const TradeScreen = () => {
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [selectedHaveCards, setSelectedHaveCards] = useState([]);
  const [selectedWantCards, setSelectedWantCards] = useState([]);
  const { isDarkMode, userId, loading: authLoading } = useAuth();
  const theme = isDarkMode ? darkPalette : lightPalette;
  const [selectionType, setSelectionType] = useState<'have' | 'want' | null>(null);
  const [shouldLoadExistingCards, setShouldLoadExistingCards] = useState(false);
  const [tradeMatches, setTradeMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [isNotifyButtonDisabled, setIsNotifyButtonDisabled] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const [acceptedTradeIds, setAcceptedTradeIds] = useState<string[]>([]);
  const navigation = useNavigation();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [friendCodeModalVisible, setFriendCodeModalVisible] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [pendingSelectionType, setPendingSelectionType] = useState<'have' | 'want' | null>(null);
  const [showAd, setShowAd] = useState(false);

  const handleAdClosed = () => {
    setShowAd(false);
  };

  const handleAdError = (error: any) => {
    console.error('Ad failed to load:', error);
    setShowAd(false);
  };

  useEffect(() => {
    const loadAcceptedTradeIds = async () => {
      try {
        const storedTradeIds = await AsyncStorage.getItem('acceptedTradeIds');
        if (storedTradeIds) {
          setAcceptedTradeIds(JSON.parse(storedTradeIds));
        }
      } catch (error) {
        console.error('Failed to load accepted trade IDs from AsyncStorage:', error);
      }
    };

    loadAcceptedTradeIds();
  }, []);

  useEffect(() => {
    const markNotificationsAsRead = async () => {
      if (!userId) return;
      
      const { error } = await supabase
        .from('trade_notifications')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    markNotificationsAsRead();

    const unsubscribe = navigation.addListener('focus', () => {
      markNotificationsAsRead();
    });

    return () => {
      unsubscribe();
    };
  }, [userId, navigation]);

  const saveAcceptedTradeIds = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem('acceptedTradeIds', JSON.stringify(ids));
    } catch (error) {
      console.error('Failed to save accepted trade IDs to AsyncStorage:', error);
    }
  };

  const fetchTradeMatches = useCallback(async () => {
    if (authLoading || !userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('trade_matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (fetchError) {
        setError(fetchError.message);
        console.error('Error fetching trade matches:', fetchError);
        return;
      }

      let filteredTradeMatches = data || [];

      filteredTradeMatches = filteredTradeMatches.filter(match => {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        return !showOnlineOnly || userProfiles[otherUserId]?.status === 'online';
      });

      setTradeMatches(filteredTradeMatches);
      const userIds = Array.from(new Set(data.flatMap(match => [match.user1_id, match.user2_id])));
      await fetchUserProfiles(userIds);

    } catch (err) {
      setError(err.message);
      console.error('An unexpected error occurred:', err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, userId, setTradeMatches, setLoading, setError, showOnlineOnly, userProfiles]);

  useEffect(() => {
    fetchTradeMatches();
    const intervalId = setInterval(fetchTradeMatches, 5000);
    return () => clearInterval(intervalId);
  }, [fetchTradeMatches]);

  useEffect(() => {
    // Poll only the status field for all loaded userProfiles every 5 seconds
    const interval = setInterval(async () => {
      const userIds = Object.keys(userProfiles);
      if (userIds.length === 0) return;
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, status')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          setUserProfiles(prevProfiles => {
            const updatedProfiles = { ...prevProfiles };
            profilesData.forEach(profile => {
              if (updatedProfiles[profile.id]) {
                updatedProfiles[profile.id] = {
                  ...updatedProfiles[profile.id],
                  status: profile.status,
                };
              }
            });
            return updatedProfiles;
          });
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userProfiles]);

  const fetchUserProfiles = async (userIds) => {
    try {
      const userIdsToFetch = userIds.filter(id => !userProfiles[id]);

      if (userIdsToFetch.length === 0) {
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, push_token, match_password, status')
        .in('id', userIdsToFetch);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        return;
      }

      const profilesMap = profilesData.reduce((acc, profile) => {
        acc[profile.id] = {
          username: profile.username,
          pushToken: profile.push_token,
          matchPassword: profile.match_password,
          status: profile.status,
        };
        return acc;
      }, {});

      setUserProfiles(prevProfiles => ({
        ...prevProfiles,
        ...profilesMap,
      }));
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'The friend code has been copied to your clipboard.',
    });
  };

  const handleAcceptTrade = async (tradeMatchId) => {
    setIsNotifyButtonDisabled(true);
    setLoading(true);
    setError(null);

    try {
      const { data: tradeMatch } = await supabase
        .from('trade_matches')
        .select('*')
        .eq('id', tradeMatchId)
        .single();

      if (!tradeMatch) {
        setError("Trade match not found.");
        return;
      }

      const isUser1 = tradeMatch.user1_id === userId;
      const columnToUpdate = isUser1 ? 'user_1' : 'user_2';
      const otherColumn = isUser1 ? 'user_2' : 'user_1';
      const otherUserId = isUser1 ? tradeMatch.user2_id : tradeMatch.user1_id;

      const { error: updateError } = await supabase
        .from('trade_matches')
        .update({ [columnToUpdate]: 'ok' })
        .eq('id', tradeMatchId);

      if (updateError) {
        setError(`Update error: ${updateError.message}`);
        return;
      }

      const otherUserProfile = userProfiles[otherUserId];
      const otherPushToken = otherUserProfile?.pushToken;

      if (otherPushToken) {
        const myCards = isUser1 ? tradeMatch.user1_cards : tradeMatch.user2_cards;
        const otherCards = isUser1 ? tradeMatch.user2_cards : tradeMatch.user1_cards;
        const myCardName = myCards.length > 0 ? getCardName(myCards[0].id) : 'Unknown Card';
        const otherCardName = otherCards.length > 0 ? getCardName(otherCards[0].id) : 'Unknown Card';
        
        const notificationMessage = tradeMatch[otherColumn] === 'ok' 
          ? `Trade Confirmed! Both players have accepted the trade.`
          : `Trade Request! Player ${userProfiles[userId]?.username} wants ${otherCardName} for ${myCardName}.`;

        await fetch('https://lbdb-server-production.up.railway.app/send-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pushToken: otherPushToken,
            message: notificationMessage,
            userId: otherUserId,
            notificationType: tradeMatch[otherColumn] === 'ok' ? 'trade_accepted' : 'trade',
          }),
        });

        await supabase
          .from('trade_notifications')
          .insert({
            sender_id: userId,
            receiver_id: otherUserId,
            trade_match_id: tradeMatchId,
            notification_type: tradeMatch[otherColumn] === 'ok' ? 'trade_accepted' : 'new_trade_request',
            message: notificationMessage,
          });
      }

      fetchTradeMatches();
      Toast.show({
        type: 'success',
        text1: tradeMatch[otherColumn] === 'ok' ? 'Trade Confirmed!' : 'Trade Request Sent',
        text2: tradeMatch[otherColumn] === 'ok' ? 'Both players have accepted.' : 'Waiting for other player...',
      });

    } catch (err) {
      setError(err.message);
      console.error('Error in handleAcceptTrade:', err);
    } finally {
      setLoading(false);
      setIsNotifyButtonDisabled(false);
    }
  };

  const handleTradeCompleted = async (tradeMatchId) => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== Trade Completion Debug ===');
      
      const { data: tradeMatch, error: fetchError } = await supabase
        .from('trade_matches')
        .select('*')
        .eq('id', tradeMatchId)
        .single();

      if (fetchError) {
        console.error('Error fetching trade:', fetchError);
        return;
      }

      console.log('Trade initial fetch:', {
        id: tradeMatch.id,
        user_1: tradeMatch.user_1,
        user_2: tradeMatch.user_2
      });

      const columnToUpdate = tradeMatch.user1_id === userId ? 'user_1' : 'user_2';
      console.log('Updating column:', columnToUpdate, 'to completed');

      const { error: updateError } = await supabase
        .from('trade_matches')
        .update({ [columnToUpdate]: 'completed' })
        .eq('id', tradeMatchId);

      if (updateError) {
        console.error('Error updating trade:', updateError);
        return;
      }

      const { data: verifyState } = await supabase
        .from('trade_matches')
        .select('*')
        .eq('id', tradeMatchId)
        .single();

      console.log('State after update:', {
        id: verifyState.id,
        user_1: verifyState.user_1,
        user_2: verifyState.user_2
      });

      if (verifyState.user_1 === 'completed' && verifyState.user_2 === 'completed') {
        console.log('Calling complete_trade for trade:', tradeMatchId);
        
        const { data, error: completeTradeError } = await supabase
          .rpc('complete_trade', { trade_match_id: tradeMatchId });

        console.log('Complete trade result:', { data, error: completeTradeError });

        const { data: finalState } = await supabase
          .from('trade_matches')
          .select('*')
          .eq('id', tradeMatchId)
          .single();

        console.log('Final trade state:', finalState ? {
          id: finalState.id,
          user_1: finalState.user_1,
          user_2: finalState.user_2
        } : 'Trade no longer exists');
      }

      console.log('=== End Debug ===');
      fetchTradeMatches();

      // Set showAd to true after trade is completed
      setShowAd(true);

    } catch (error) {
      console.error('Error during trade completion:', error);
      setError('Failed to complete trade');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrade = async (tradeMatchId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trade_matches')
        .delete()
        .eq('id', tradeMatchId);

      if (error) {
        console.error('Error canceling trade:', error);
        setError('Failed to cancel trade');
        return;
      }

      fetchTradeMatches();
      Toast.show({
        type: 'success',
        text1: 'Trade Canceled',
        text2: 'The trade has been canceled successfully.',
      });
    } catch (error) {
      console.error('Error in handleCancelTrade:', error);
      setError('Failed to cancel trade');
    } finally {
      setLoading(false);
    }
  };

  const validateMatchPassword = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('match_password')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching match password:', error);
        return false;
      }

      const isValidFormat = data.match_password && /^\d{16}$/.test(data.match_password);
      return isValidFormat;
    } catch (error) {
      console.error('Error in validateMatchPassword:', error);
      return false;
    }
  };

  const handleYourCardsPress = async () => {
    const isValidPassword = await validateMatchPassword();
    if (!isValidPassword) {
      setPendingSelectionType('have');
      setFriendCodeModalVisible(true);
      return;
    }

    setSelectionType('have');
    setShouldLoadExistingCards(true);
    setShowCardSelection(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad),
    }).start();
  };

  const handleCardsYouWantPress = async () => {
    const isValidPassword = await validateMatchPassword();
    if (!isValidPassword) {
      setPendingSelectionType('want');
      setFriendCodeModalVisible(true);
      return;
    }

    setSelectionType('want');
    setShouldLoadExistingCards(true);
    setShowCardSelection(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad),
    }).start();
  };

  const handleFriendCodeSubmit = async () => {
    const code = friendCodeInput.replace(/[^\d]/g, '');
    if (code.length !== 16) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Friend Code',
        text2: 'Friend Code must be exactly 16 numbers.'
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ match_password: code })
        .eq('id', userId);
      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message
        });
        return;
      }
      Toast.show({
        type: 'success',
        text1: 'Friend Code set successfully!'
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Failed to update Friend Code'
      });
    } finally {
      setLoading(false);
    }
    setFriendCodeModalVisible(false);
    if (pendingSelectionType === 'have') {
      setSelectionType('have');
      setShouldLoadExistingCards(true);
      setShowCardSelection(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.quad),
      }).start();
    } else if (pendingSelectionType === 'want') {
      setSelectionType('want');
      setShouldLoadExistingCards(true);
      setShowCardSelection(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.quad),
      }).start();
    }
    setPendingSelectionType(null);
    setFriendCodeInput('');
  };

  const handleFriendCodeCancel = () => {
    setFriendCodeModalVisible(false);
    setPendingSelectionType(null);
    setFriendCodeInput('');
  };

  const handleBack = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad),
    }).start(() => {
      setShowCardSelection(false);
      setShouldLoadExistingCards(false);
    });
  };

  const handleCardsSelected = (cards) => {
    if (selectionType === 'have') {
      setSelectedHaveCards(cards);
    } else if (selectionType === 'want') {
      setSelectedWantCards(cards);
    }
    setShowCardSelection(false);
    setShouldLoadExistingCards(false);
  };

  const isTradeAccepted = (tradeMatchId) => {
    return acceptedTradeIds.includes(tradeMatchId);
  };

  const renderTradeMatchItem = ({ item }) => {
    const isUser1 = item.user1_id === userId;
    const otherUserId = isUser1 ? item.user2_id : item.user1_id;
    const myColumn = isUser1 ? item.user_1 : item.user_2;
    const otherColumn = isUser1 ? item.user_2 : item.user_1;

    const showConfirmButton = (!myColumn || myColumn === '') || 
                            (isUser1 && myColumn === 'pending') ||
                            (!isUser1 && myColumn === 'pending');

    const showTradeCompleted = (
        ((item.user_1 === 'ok' && item.user_2 === 'ok') ||
        (item.user_1 === 'completed' && item.user_2 === 'ok') ||
        (item.user_1 === 'ok' && item.user_2 === 'completed')) &&
        myColumn !== 'completed'
    );

    const user1Cards = item.user1_id === userId ? item.user1_cards : item.user2_cards;
    const user2Cards = item.user1_id === userId ? item.user2_cards : item.user1_cards;
    const otherUsername = userProfiles[otherUserId]?.username || 'Unknown User';
    const otherUserMatchPassword = userProfiles[otherUserId]?.matchPassword || 'N/A';
    const otherUserStatus = userProfiles[otherUserId]?.status || 'offline';

    const user1CardName = user1Cards.length > 0 ? getCardName(user1Cards[0].id) : 'No Card';
    const user2CardName = user2Cards.length > 0 ? getCardName(user2Cards[0].id) : 'No Card';
    const accordionTitle = `${user1CardName} ➔ ${user2CardName} - Status: ${item.status}`;

    const handleAccept = async (tradeMatchId) => {
      await handleAcceptTrade(tradeMatchId);
      const updatedTradeIds = [...acceptedTradeIds, tradeMatchId];
      setAcceptedTradeIds(updatedTradeIds);
      saveAcceptedTradeIds(updatedTradeIds);
    };

    const statusColor = otherUserStatus === 'online' ? 'green' : 'red';

    return (
      <Accordion title={accordionTitle} status={otherUserStatus}>
        <View style={[styles.matchItem, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.matchText, { color: theme.text }]}>Trade with: {otherUsername}</Text>
          <View style={styles.cardColumnsContainer}>
            <View style={styles.cardColumn}>
              <Text style={[styles.columnTitle, { color: theme.text }]}>I Have:</Text>
              {user1Cards.map((card) => (
                <Image
                  key={card.id}
                  source={{ uri: getCardImage(card.id) }}
                  style={styles.cardImage}
                />
              ))}
            </View>
            <View style={styles.arrowContainer}>
              <MaterialCommunityIcons name="arrow-right" size={24} color={theme.text} style={styles.arrowIconTop} />
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
            </View>
            <View style={styles.cardColumn}>
              <Text style={[styles.columnTitle, { color: theme.text }]}>I Want:</Text>
              {user2Cards.map((card) => (
                <Image
                  key={card.id}
                  source={{ uri: getCardImage(card.id) }}
                  style={styles.cardImage}
                />
              ))}
            </View>
          </View>
          {showTradeCompleted && (
            <View style={styles.matchPasswordContainer}>
              <Text style={[styles.matchPasswordLabel, { color: theme.text }]}>Friend Code:</Text>
              <View style={styles.passwordRow}>
                <Text style={[styles.matchPasswordText, { color: theme.text }]}>{otherUserMatchPassword}</Text>
                <TouchableOpacity onPress={() => copyToClipboard(otherUserMatchPassword)}>
                  <MaterialCommunityIcons name="content-copy" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={styles.actionButtonContainer}>
            {showTradeCompleted ? (
              <TouchableOpacity
                style={[styles.completedButton, { backgroundColor: theme.buttonBackground2 }]}
                onPress={() => handleTradeCompleted(item.id)}
              >
                <Text style={[styles.completedButtonText, { color: theme.text }]}>
                  Trade Completed
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {showConfirmButton && (
                  <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: 'green' }]}
                    onPress={() => handleAcceptTrade(item.id)}
                    disabled={isNotifyButtonDisabled}
                  >
                    <MaterialCommunityIcons name="check" color="white" size={24} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: 'red' }]}
                  onPress={() => handleCancelTrade(item.id)}
                  disabled={isNotifyButtonDisabled}
                >
                  <MaterialCommunityIcons name="close" color="white" size={24} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Accordion>
    );
  };

  const renderOfferSection = ({ title, cards, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{ flex: 1 }}>
      <View style={[styles.offerSection, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'offer') {
      return renderOfferSection({ title: item.title, cards: item.cards, onPress: item.onPress });
    } else if (item.type === 'tradeMatch') {
      return renderTradeMatchItem({ item: item.data });
    }
    return null;
  };

  const sections = [
    { type: 'offer', title: 'I Have', cards: selectedHaveCards, onPress: handleYourCardsPress },
    { type: 'offer', title: 'I Want', cards: selectedWantCards, onPress: handleCardsYouWantPress },
  ];

  const data = [...sections, ...tradeMatches.map(match => ({ type: 'tradeMatch', data: match }))];

  const slideIn = {
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
  };

  useEffect(() => {
    console.log('TradeScreen mounted. Auth state:', { authLoading, userId });
  }, [authLoading, userId]);

  if (authLoading) {
    console.log('TradeScreen: Still loading auth...', { authLoading, userId });
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Please log in to view trades.</Text>
      </View>
    );
  }

  const groupedTrades = groupTradesByOtherUser(tradeMatches, userId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Friend Code Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={friendCodeModalVisible}
        onRequestClose={handleFriendCodeCancel}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Your Friend Code hasn't been set yet. You need it to trade cards.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.inputBorder }]}
              value={friendCodeInput}
              onChangeText={setFriendCodeInput}
              placeholder="Enter Friend Code (16 numbers)"
              placeholderTextColor={theme.placeholderText}
              keyboardType="numeric"
              maxLength={16}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.buttonBackground, flex: 1, marginRight: 10 }]}
                onPress={handleFriendCodeSubmit}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.error, flex: 1, marginLeft: 10 }]}
                onPress={handleFriendCodeCancel}
              >
                <Text style={[styles.buttonText, { color: theme.buttonText }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.toggleContainer}>
        <View style={styles.tradeHeader}>
          <Text style={[styles.tradeInProgress, { color: theme.text }]}>Available Trade</Text>
          <Text style={[styles.filter, { color: theme.text }]}>Online Only</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={showOnlineOnly ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setShowOnlineOnly}
            value={showOnlineOnly}
          />
        </View>
      </View>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.offersContainer}>
              {renderOfferSection({ title: 'I Have', cards: selectedHaveCards, onPress: handleYourCardsPress })}
              {renderOfferSection({ title: 'I Want', cards: selectedWantCards, onPress: handleCardsYouWantPress })}
            </View>
          </>
        }
        data={Object.entries(groupedTrades)}
        keyExtractor={([otherUserId]) => otherUserId}
        renderItem={({ item }) => {
          const [otherUserId, trades] = item;
          return (
            <Accordion
              title={`Scambi disponibili con ${userProfiles[otherUserId]?.username || otherUserId}`}
              showStatusIndicator={true}
              status={userProfiles[otherUserId]?.status}
            >
              {trades.map(trade => (
                <View key={trade.id}>
                  {renderTradeMatchItem({ item: trade })}
                </View>
              ))}
            </Accordion>
          );
        }}
        ListEmptyComponent={<Text style={{ color: theme.text }}>No trade matches found.</Text>}
        ListFooterComponent={error && <Text style={{ color: 'red' }}>Error: {error}</Text>}
      />
      <View style={styles.bannerAdContainer}>
        <BannerAdComponent />
      </View>
      {showAd && (
        <InterstitialAdComponent
          onAdClosed={handleAdClosed}
          onAdFailedToLoad={handleAdError}
        />
      )}
      <Animated.View style={[slideIn, { flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: showCardSelection ? 1 : -1 }]}>
        {showCardSelection && (
          <TradeCardSelection
            onCardsSelected={handleCardsSelected}
            isDarkMode={isDarkMode}
            loadExistingCards={shouldLoadExistingCards}
            onBack={handleBack}
            selectionType={selectionType}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  offersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  offerSection: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 0,
    textAlign: 'center',
  },
  cardList: {
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  confirmButton: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
  tradeInProgress: {
    fontSize: 28,
    marginTop: 10,
    marginBottom: 20,
  },
  filter: {
    fontSize: 15,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 50,
  },
  matchList: {
    width: '100%',
  },
  matchItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  matchText: {
    fontSize: 16,
    marginBottom: 5
  },
  cardImage: {
    width: 80,
    height: 112,
    marginRight: 10,
    borderRadius: 5,
  },
  cardColumnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  cardColumn: {
    alignItems: 'center',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIconTop: {
    marginBottom: -5
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  completedButton: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'blue',
  },
  completedButtonText: {
    fontSize: 16,
  },
  matchPasswordContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#969696',
    borderRadius: 5,
  },
  matchPasswordLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  matchPasswordText: {
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  bannerAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});

export default TradeScreen;