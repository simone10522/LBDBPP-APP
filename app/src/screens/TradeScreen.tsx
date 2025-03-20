import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Animated, Easing, Switch } from 'react-native'; // Import Switch
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightPalette, darkPalette } from '../context/themes';
import TradeCardSelection from '../components/TradeCardSelection';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import A1 from '../../assets/cards/A1.json';
import A2 from '../../assets/cards/A2.json';
import A1a from '../../assets/cards/A1a.json';
import A2a from '../../assets/cards/A2a.json';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Accordion from '../components/Accordion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';

const loadCardData = () => {
  const allCards = {};
  [A1, A2, A1a, A2a].forEach(set => {
    set.cards.forEach(card => {
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
  const animation = useRef(new Animated.Value(0)).current; // Add Animated.Value
  const [acceptedTradeIds, setAcceptedTradeIds] = useState<string[]>([]);
  const navigation = useNavigation();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false); // Add state for the toggle


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

      // Filter trade matches based on the online status of the other user
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

  const fetchUserProfiles = async (userIds) => {
    try {
      // Fetch only profiles that are not already in the state
      const userIdsToFetch = userIds.filter(id => !userProfiles[id]);

      if (userIdsToFetch.length === 0) {
        return; // No new profiles to fetch
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, push_token, match_password, status') // Fetch status
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
          status: profile.status, // Store status
        };
        return acc;
      }, {});

      // Merge new profiles into existing state
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
    Alert.alert('The friend code has been copied to your clipboard.');
  };

  const handleAcceptTrade = async (tradeMatchId) => {
    setIsNotifyButtonDisabled(true); // Disable button immediately on press
    setLoading(true);
    setError(null);

    let tradeMatch;
    try {
      const { data, error: fetchError } = await supabase
        .from('trade_matches')
        .select('*')
        .eq('id', tradeMatchId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        console.error('Error fetching trade match details:', fetchError);
        setLoading(false);
        setIsNotifyButtonDisabled(false); // Re-enable button in case of fetch error
        return;
      }
      tradeMatch = data;
    } catch (err) {
      setError(err.message);
      console.error('Unexpected error fetching trade match:', err);
      setLoading(false);
      setIsNotifyButtonDisabled(false); // Re-enable button in case of unexpected error
      return;
    }


    if (!tradeMatch) {
      setError("Trade match not found.");
      setLoading(false);
      setIsNotifyButtonDisabled(false); // Re-enable button if trade match not found
      return;
    }

    if (tradeMatch.status !== 'pending' && tradeMatch.status !== 'request sent') {
      setError(`Invalid trade status for acceptance: ${tradeMatch.status}`);
      Alert.alert("Invalid Trade Status", `This trade is not in 'Pending' or 'Request Sent' status and cannot be accepted.`);
      setLoading(false);
      setIsNotifyButtonDisabled(false); // Re-enable button if status is invalid
      return;
    }

    if (tradeMatch.status === 'request sent') {
      // Logic to confirm the trade if status is 'request sent'
      try {
        const { error: updateError } = await supabase
          .from('trade_matches')
          .update({ status: 'confirmed' })
          .eq('id', tradeMatchId);

        if (updateError) {
          console.error("Error updating trade status to confirmed:", updateError);
          setError(`Supabase error: ${updateError.message}`);
          Alert.alert("Status Update Error", "Failed to update trade status to confirmed. Please try again.");
          setIsNotifyButtonDisabled(false); // Re-enable button after status update error
        } else {
          console.log(`Trade status updated successfully to 'confirmed' for match ID: ${tradeMatchId}`);
          Alert.alert("Trade Confirmed", "Trade has been confirmed.");

          // Send "Trade Accepted" notification to user1 (the initiator)
          const initiatorUserId = tradeMatch.user1_id;
          const initiatorUserProfile = userProfiles[initiatorUserId];
          const initiatorPushToken = initiatorUserProfile?.pushToken;

          if (initiatorPushToken) {
            const initiatorUsername = initiatorUserProfile?.username || 'Unknown User';
            const notificationMessage = `Trade Accepted! Player ${userProfiles[userId]?.username} has accepted your trade request.`;
            sendTradeAcceptedNotification(initiatorPushToken, notificationMessage, initiatorUserId, initiatorUsername);
          } else {
            console.error("Could not retrieve push token for the trade initiator user.");
          }

          fetchTradeMatches(); // Refresh trade matches to update UI
          setIsNotifyButtonDisabled(false); // Re-enable button after successful trade confirmation and notification
        }
      } catch (err) {
        setError(err.message);
        console.error('Unexpected error confirming trade:', err);
        Alert.alert("Trade Confirmation Error", "Failed to confirm trade. Please try again.");
        setIsNotifyButtonDisabled(false); // Re-enable button after unexpected confirmation error
      } finally {
        setLoading(false);
        setIsNotifyButtonDisabled(false); // Ensure button is re-enabled in finally block
      }
    } else {
      // Original logic for when status is 'pending' (send notification and update to 'request sent')
      const otherUserId = tradeMatch.user1_id === userId ? tradeMatch.user2_id : tradeMatch.user1_id;
      const myCards = tradeMatch.user1_id === userId ? tradeMatch.user1_cards : tradeMatch.user2_cards;
      const otherCards = tradeMatch.user1_id === userId ? tradeMatch.user2_cards : tradeMatch.user1_cards;

      const myCardName = myCards.length > 0 ? getCardName(myCards[0].id) : 'Unknown Card';
      const otherCardName = otherCards.length > 0 ? getCardName(otherCards[0].id) : 'Unknown Card';

      const otherUserProfile = userProfiles[otherUserId];
      const otherUserPushToken = otherUserProfile?.pushToken;

      if (!otherUserPushToken) {
        setError("Could not retrieve push token for the other user.");
        setLoading(false);
        setIsNotifyButtonDisabled(false); // Re-enable button if push token not found
        return;
      }

      const notificationMessage = `Trade Request Sent! Player ${userProfiles[userId]?.username} has sent a trade request for ${otherCardName} for ${myCardName}. Please check the trade screen to respond.`;

      const requestBody = JSON.stringify({
        pushToken: otherUserPushToken,
        message: notificationMessage,
        userId: otherUserId,
        notificationType: 'trade',
      });

      const serverUrl = 'https://lbdb-server.onrender.com/send-notification';
      console.log("Sending notification request to:", serverUrl);
      console.log("Request body:", requestBody);

      try {
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Notification request failed with status:", response.status);
          console.error("Error details from server:", errorData);
          throw new Error(`Failed to send notification: ${response.status} - ${JSON.stringify(errorData)}`);
          setIsNotifyButtonDisabled(false); // Re-enable button after notification error
        }

        console.log(`Trade request sent and notification dispatched for match ID: ${tradeMatchId}`);
        Alert.alert("Trade Request Sent", "A trade request has been sent to the other user.");

        // Update trade status in Supabase to 'request sent'
        const { error: updateError } = await supabase
          .from('trade_matches')
          .update({ status: 'request sent' })
          .eq('id', tradeMatchId);

        if (updateError) {
          console.error("Error updating trade status:", updateError);
          setError(`Supabase error: ${updateError.message}`);
          Alert.alert("Status Update Error", "Failed to update trade status. Please try again.");
          setIsNotifyButtonDisabled(false); // Re-enable button after status update error
        } else {
          console.log(`Trade status updated successfully to 'request sent' for match ID: ${tradeMatchId}`);
          // Optionally, refetch trade matches to update the UI
          fetchTradeMatches();
        }

      } catch (notificationError) {
        console.error("Error sending push notification:", notificationError);
        setError(`Notification error: ${notificationError.message}`);
        Alert.alert("Notification Error", "Failed to send notification. Please try again.");
        setIsNotifyButtonDisabled(false); // Re-enable button after general notification error
      } finally {
        setLoading(false);
        setIsNotifyButtonDisabled(false); // Ensure button is re-enabled in finally block
      }
    }
  };

  const sendTradeAcceptedNotification = async (pushToken, message, userId, username) => {
    const requestBody = JSON.stringify({
      pushToken: pushToken,
      message: message,
      userId: userId,
      notificationType: 'trade_accepted',
      username: username // Pass username if you want to include it in the backend logic
    });

    const serverUrl = 'https://lbdb-server.onrender.com/send-notification';
    console.log("Sending 'Trade Accepted' notification request to:", serverUrl);
    console.log("Request body:", requestBody);

    try {
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Notification request failed with status:", response.status);
        console.error("Error details from server:", errorData);
        throw new Error(`Failed to send notification: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      console.log("'Trade Accepted' notification sent successfully");
      Alert.alert("Notification Sent", "'Trade Accepted' notification was sent to the other player."); // Optional alert for sender
    } catch (notificationError) {
      console.error("Error sending 'Trade Accepted' push notification:", notificationError);
      setError(`Notification error: ${notificationError.message}`);
      Alert.alert("Notification Error", "Failed to send notification. Please try again.");
    }
  };


  const handleCancelTrade = async (tradeMatchId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('trade_matches')
        .delete()
        .eq('id', tradeMatchId);

      if (deleteError) {
        setError(deleteError.message);
        console.error('Error deleting trade match:', deleteError);
      } else {
        fetchTradeMatches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Unexpected error deleting trade:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleYourCardsPress = () => {
    setSelectionType('have');
    setShouldLoadExistingCards(true);
    setShowCardSelection(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad), // Example: Add an easing function
    }).start();
  };

  const handleCardsYouWantPress = () => {
    setSelectionType('want');
    setShouldLoadExistingCards(true);
    setShowCardSelection(true);
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad), // Example: Add an easing function
    }).start();
  };

  const handleBack = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad), // Example: Add an easing function
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

  const handleTradeCompleted = async (user1Cards, user2Cards) => {
    let tradeMatchIdToDelete = null;
    setLoading(true);
    setError(null);

    try {
      // Fetch trade cards for both users
      const { data: user1TradeCards, error: user1TradeCardsError } = await supabase
        .from('trade_cards')
        .select('what_i_have, what_i_want')
        .eq('user_id', userId)
        .single();

      const tradeMatch = tradeMatches.find(match =>
        (match.user1_id === userId && match.user1_cards[0].id === user1Cards[0].id && match.user2_cards[0].id === user2Cards[0].id) ||
        (match.user2_id === userId && match.user2_cards[0].id === user1Cards[0].id && match.user1_cards[0].id === user2Cards[0].id)
      );

      if (!tradeMatch) {
        setError("Trade match not found locally.");
        setLoading(false);
        return;
      }

      const otherUserId = tradeMatch.user1_id === userId ? tradeMatch.user2_id : tradeMatch.user1_id;

      const { data: user2TradeCards, error: user2TradeCardsError } = await supabase
        .from('trade_cards')
        .select('what_i_have, what_i_want')
        .eq('user_id', otherUserId)
        .single();

      if (user1TradeCardsError) {
        console.error('Error fetching user1 trade cards:', user1TradeCardsError);
        setError('Failed to update your cards.');
        setLoading(false);
        return;
      }

      if (user2TradeCardsError) {
        console.error('Error fetching user2 trade cards:', user2TradeCardsError);
        setError('Failed to update other user\'s cards.');
        setLoading(false);
        return;
      }

      let updatedUser1HaveCards = user1TradeCards?.what_i_have || [];
      let updatedUser1WantCards = user1TradeCards?.what_i_want || [];
      let updatedUser2HaveCards = user2TradeCards?.what_i_have || [];
      let updatedUser2WantCards = user2TradeCards?.what_i_want || [];

      // User 1 gives user1Cards[0], receives user2Cards[0]
      // User 2 gives user2Cards[0], receives user1Cards[0]

      // Update user 1's what_i_have (remove user1Cards[0])
      const user1HaveCardIndex = updatedUser1HaveCards.findIndex(card => card.id === user1Cards[0].id);
      if (user1HaveCardIndex !== -1) {
        if (updatedUser1HaveCards[user1HaveCardIndex].count > 1) {
          updatedUser1HaveCards[user1HaveCardIndex].count -= 1;
        } else {
          updatedUser1HaveCards.splice(user1HaveCardIndex, 1);
        }
      }

      // Update user 1's what_i_want (remove user2Cards[0])
      updatedUser1WantCards = updatedUser1WantCards.filter(card => card.id !== user2Cards[0].id);


      // Update user 2's what_i_have (remove user2Cards[0])
      const user2HaveCardIndex = updatedUser2HaveCards.findIndex(card => card.id === user2Cards[0].id);
      if (user2HaveCardIndex !== -1) {
        if (updatedUser2HaveCards[user2HaveCardIndex].count > 1) {
          updatedUser2HaveCards[user2HaveCardIndex].count -= 1;
        } else {
          updatedUser2HaveCards.splice(user2HaveCardIndex, 1);
        }
      }

      // Update user 2's what_i_want (remove user1Cards[0])
      updatedUser2WantCards = updatedUser2WantCards.filter(card => card.id !== user1Cards[0].id);


      // Update user 1's trade_cards
      const { error: updateUser1Error } = await supabase
        .from('trade_cards')
        .update({ what_i_have: updatedUser1HaveCards, what_i_want: updatedUser1WantCards })
        .eq('user_id', userId);

      if (updateUser1Error) {
        console.error('Error updating user 1 trade cards:', updateUser1Error);
        setError('Failed to update your cards in the trade.');
        setLoading(false);
        return;
      }

      // Update user 2's trade_cards
      const { error: updateUser2Error } = await supabase
        .from('trade_cards')
        .update({ what_i_have: updatedUser2HaveCards, what_i_want: updatedUser2WantCards })
        .eq('user_id', otherUserId);

      if (updateUser2Error) {
        console.error('Error updating user 2 trade cards:', updateUser2Error);
        setError('Failed to update the other user\'s cards in the trade.');
        setLoading(false);
        return;
      }


      // Fetch the trade_matches id before deleting
      const { data: tradeMatchData, error: tradeMatchError } = await supabase
        .from('trade_matches')
        .select('id')
        .or(`and(user1_id.eq.${userId},user1_cards.cs.[{"id":"${user1Cards[0].id}"}]),and(user2_id.eq.${userId},user2_cards.cs.[{"id":"${user1Cards[0].id}"}])`)
        .eq('status', 'confirmed')
        .limit(1);

      if (tradeMatchError) {
        console.error('Error fetching trade match:', tradeMatchError);
      } else if (tradeMatchData && tradeMatchData.length > 0) {
        tradeMatchIdToDelete = tradeMatchData[0].id;
      }

      // Delete the trade from trade_matches table
      if (tradeMatchIdToDelete) {
        const { error: deleteError } = await supabase
          .from('trade_matches')
          .delete()
          .eq('id', tradeMatchIdToDelete);

        if (deleteError) {
          console.error('Error deleting trade match:', deleteError);
        } else {
          console.log('Trade match deleted successfully.');
        }
      } else {
        console.log('No trade match found to delete.');
      }

    } catch (error) {
      console.error('Error during trade completion:', error);
      setError('Failed to complete trade.');
    } finally {
      setLoading(false);
    }

    navigation.navigate('TradeCompletedAnimation', {
      myCardImage: getCardImage(user1Cards[0].id),
      otherCardImage: getCardImage(user2Cards[0].id),
    });
  };

  const renderTradeMatchItem = ({ item }) => {
    const otherUserId = item.user1_id === userId ? item.user2_id : item.user1_id;
    const user1Cards = item.user1_id === userId ? item.user1_cards : item.user2_cards;
    const user2Cards = item.user1_id === userId ? item.user2_cards : item.user1_cards;
    const otherUsername = userProfiles[otherUserId]?.username || 'Unknown User';
    const otherUserMatchPassword = userProfiles[otherUserId]?.matchPassword || 'N/A'; // Get match_password
    const otherUserStatus = userProfiles[otherUserId]?.status || 'offline'; // Get status, default to offline

    const user1CardName = user1Cards.length > 0 ? getCardName(user1Cards[0].id) : 'No Card';
    const user2CardName = user2Cards.length > 0 ? getCardName(user2Cards[0].id) : 'No Card';
    const accordionTitle = `${user1CardName} ➔ ${user2CardName} - Status: ${item.status}`;

    const handleAccept = async (tradeMatchId) => {
      await handleAcceptTrade(tradeMatchId);
      const updatedTradeIds = [...acceptedTradeIds, tradeMatchId];
      setAcceptedTradeIds(updatedTradeIds);
      saveAcceptedTradeIds(updatedTradeIds);
    };

     // Determine the color of the status indicator
    const statusColor = otherUserStatus === 'online' ? 'green' : 'red';

    return (
      <Accordion title={accordionTitle} status={otherUserStatus} showStatusIndicator={true}>
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
          {item.status === 'confirmed' && (
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
            {item.status !== 'confirmed' ? (
              <>
                {!isTradeAccepted(item.id) && (
                  <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: 'green' }]}
                    onPress={() => handleAccept(item.id)}
                    disabled={isNotifyButtonDisabled}
                  >
                    <MaterialCommunityIcons name="check" color="white" size={24} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: 'red' }]}
                  onPress={() => handleCancelTrade(item.id)}
                >
                  <MaterialCommunityIcons name="close" color="white" size={24} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.completedButton, { backgroundColor: theme.buttonBackground2 }]}
                onPress={() => handleTradeCompleted(user1Cards, user2Cards)} // Add action for "Trade Completed" later
              >
                <Text style={[styles.completedButtonText, { color: theme.text }]}>Trade Completed</Text>
              </TouchableOpacity>
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
          outputRange: [300, 0], // Slide in from the right
        }),
      },
    ],
  };

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <Text style={{ color: theme.text }}>Loading authentication...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <Text style={{ color: theme.text }}>Please log in to view trades.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.toggleContainer}>
      </View>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.offersContainer}>
              {renderOfferSection({ title: 'I Have', cards: selectedHaveCards, onPress: handleYourCardsPress })}
              {renderOfferSection({ title: 'I Want', cards: selectedWantCards, onPress: handleCardsYouWantPress })}
            </View>
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
          </>
        }
        data={tradeMatches}
        renderItem={renderTradeMatchItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={{ color: theme.text }}>No trade matches found.</Text>}
        ListFooterComponent={
          <>
            {error && <Text style={{ color: 'red' }}>Error: {error}</Text>}
          </>
        }
      />
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
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center'
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
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
});

export default TradeScreen;
