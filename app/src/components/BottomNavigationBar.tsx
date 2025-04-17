import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { Home, List, User, BarChart4, Repeat, MessageSquare } from 'lucide-react-native';
import { supabase } from '../lib/supabase'; // Assicurati di importare il client Supabase
import { fetchUnreadMatchNotifications } from '../utils/notificationUtils';
import { appEvents, EVENTS } from '../utils/eventEmitter';

const BottomNavigationBar = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [tradeNotifications, setTradeNotifications] = useState(0);
  const [chatNotifications, setChatNotifications] = useState(0);
  const [tournamentNotifications, setTournamentNotifications] = useState(0);

  const updateTournamentNotifications = useCallback((count: number) => {
    setTournamentNotifications(count);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread notifications count
    const fetchUnreadNotifications = async () => {
      const { data, error } = await supabase
        .from('trade_notifications')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (!error && data) {
        setTradeNotifications(data.length);
      }
    };

    fetchUnreadNotifications();

    // Subscription per nuove notifiche
    const tradeSubscription = supabase
      .channel('custom-insert-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_notifications',
        filter: `receiver_id=eq.${user.id}`
      },
      () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    // Subscription per aggiornamenti notifiche
    const updateSubscription = supabase
      .channel('custom-update-channel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trade_notifications',
        filter: `receiver_id=eq.${user.id}`
      },
      () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tradeSubscription);
      supabase.removeChannel(updateSubscription);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch initial unread messages count
    const fetchUnreadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (!error && data) {
        setChatNotifications(data.length);
      }
    };

    fetchUnreadMessages();

    // Sottoscrizione per le notifiche chat
    const chatSubscription = supabase
      .channel('chat_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id} and read=eq.false`,
      }, 
      () => {
        fetchUnreadMessages(); // Aggiorna il conteggio quando arriva un nuovo messaggio
      })
      .subscribe();

    // Subscription per aggiornamenti messaggi letti
    const updateSubscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, 
      () => {
        fetchUnreadMessages(); // Aggiorna il conteggio quando i messaggi vengono segnati come letti
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatSubscription);
      supabase.removeChannel(updateSubscription);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const matchesChannel = supabase.channel('matches_notifications')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `or(player1_id.eq.${user.id},player2_id.eq.${user.id})`
        }, 
        (payload) => {
            fetchUnreadMatchNotifications(user.id, updateTournamentNotifications);
        })
        .subscribe();

    // Fetch iniziale
    fetchUnreadMatchNotifications(user.id, updateTournamentNotifications);

    return () => {
        supabase.removeChannel(matchesChannel);
    };
  }, [user, updateTournamentNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      if (user) {
        fetchUnreadMatchNotifications(user.id, updateTournamentNotifications);
      }
    };

    appEvents.on(EVENTS.REFRESH_NOTIFICATIONS, handleRefresh);
    return () => appEvents.off(EVENTS.REFRESH_NOTIFICATIONS, handleRefresh);
  }, [user, updateTournamentNotifications]);

  const handleProfilePress = () => {
    if (user) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Login');
    }
  };

  const handleTradePress = async () => {
    if (user) {
      // Marca tutte le notifiche come lette prima di navigare
      await supabase
        .from('trade_notifications')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      // Aggiorna immediatamente il contatore locale
      setTradeNotifications(0);
    }
    
    // Naviga alla schermata Trade
    navigation.navigate('TradeScreen');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
        <Home color="#fff" size={24} />
        <Text style={styles.buttonText}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('TournamentPage')}>
        <View>
          <List color="#fff" size={24} />
          {tournamentNotifications > 0 && ( // Mostra il badge solo se il conteggio è maggiore di zero
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tournamentNotifications}</Text>
            </View>
          )}
        </View>
        <Text style={styles.buttonText}>Tornei</Text>
      </TouchableOpacity>
      {/* Rimosso temporaneamente il tasto Ranked */}
      {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('RankedScreen')}>
        <BarChart4 color="#fff" size={24} />
        <Text style={styles.buttonText}>Ranked</Text>
      </TouchableOpacity> */}
      {user && ( // Mostro il pulsante Chat solo se l'utente è loggato
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChatListScreen')}>
          <View>
            <MessageSquare color="#fff" size={24} />
            {chatNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{chatNotifications}</Text>
              </View>
            )}
          </View>
          <Text style={styles.buttonText}>Chat</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={handleTradePress}>
        <View>
          <Repeat color="#fff" size={24} />
          {tradeNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tradeNotifications}</Text>
            </View>
          )}
        </View>
        <Text style={styles.buttonText}>Trade</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleProfilePress}>
        <User color="#fff" size={24} />
        <Text style={styles.buttonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 5, // Modifica questo valore per cambiare l'altezza. Diminuisci per una barra più piccola, aumenta per una più grande.
  },
  button: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 10, // Modifica questo valore per cambiare la dimensione del testo. Diminuisci per testo più piccolo, aumenta per testo più grande.
    marginTop: 3, // Regola anche questo valore se necessario per allineare il testo con l'icona
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});

export default BottomNavigationBar;
