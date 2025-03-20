const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = 'https://pmgibubmmyjadiltkmax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ2lidWJtbXlqYWRpbHRrbWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjQ0ODksImV4cCI6MjA1MTUwMDQ4OX0.YTmPshWZBxX1zeKncOAgakpf_p7Pv26GS-c4E9ut8e0';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const POLLING_INTERVAL = 2000;
const keepAliveInterval = 300000; // 5 minuti

async function matchTrades(trades, pendingMatches) {
  console.log('Checking trade matches...');

  for (let i = 0; i < trades.length; i++) {
    const trade1 = trades[i];
    console.log(`Trade 1 (User ${trade1.user_id}): Wants ${trade1.what_i_want.map(card => card.name).join(', ')}, Haves ${trade1.what_i_have.map(card => card.name).join(', ')}`);

    for (let j = i + 1; j < trades.length; j++) {
      const trade2 = trades[j];
      console.log(`  Trade 2 (User ${trade2.user_id}): Wants ${trade2.what_i_want.map(card => card.name).join(', ')}, Haves ${trade2.what_i_have.map(card => card.name).join(', ')}`);

      if (trade1.user_id === trade2.user_id) {
        console.log(`    Skipping: Same user`);
        continue;
      }

      const trade1Wants = trade1.what_i_want;
      const trade1Haves = trade1.what_i_have;
      const trade2Wants = trade2.what_i_want;
      const trade2Haves = trade2.what_i_have;

      const matchedCards1to2 = [];
      const matchedCards2to1 = [];

      console.log(`    Comparing Trade 1 Wants with Trade 2 Haves...`);
      for (const wantCard1 of trade1Wants) {
        for (const haveCard2 of trade2Haves) {
          console.log(`      Comparing Want Card 1: ${wantCard1.name} with Have Card 2: ${haveCard2.name}`);
          if (
            wantCard1.rarity === haveCard2.rarity &&
            wantCard1.id === haveCard2.id &&
            wantCard1.language === haveCard2.language
          ) {
            matchedCards1to2.push({ want: wantCard1, have: haveCard2 });
            console.log(`        Match found 1->2: Want ${wantCard1.name}, Have ${haveCard2.name}`);
          }
        }
      }

      console.log(`    Comparing Trade 2 Wants with Trade 1 Haves...`);
      for (const wantCard2 of trade2Wants) {
        for (const haveCard1 of trade1Haves) {
          console.log(`      Comparing Want Card 2: ${wantCard2.name} with Have Card 1: ${haveCard1.name}`);
          if (
            wantCard2.rarity === haveCard1.rarity &&
            wantCard2.id === haveCard1.id &&
            wantCard2.language === haveCard1.language
          ) {
            matchedCards2to1.push({ want: wantCard2, have: haveCard1 });
            console.log(`        Match found 2->1: Want ${wantCard2.name}, Have ${haveCard1.name}`);
          }
        }
      }

      // Iterate through all possible matches *before* checking for pending or 'request sent' trades
      for (let k = 0; k < matchedCards1to2.length; k++) {
        for (let l = 0; l < matchedCards2to1.length; l++) {
          const card1to2 = matchedCards1to2[k];
          const card2to1 = matchedCards2to1[l];

          // Check if a trade with 'request sent' status already exists for these users and cards
          const existingRequestSent = await checkExistingRequestSent(
            trade1.user_id,
            trade2.user_id,
            card2to1.have, // User1 gives card2to1.have
            card1to2.have  // User2 gives card1to2.have
          );

          if (existingRequestSent) {
            console.log(`    Skipping: Trade with 'request sent', 'confirmed', or 'completed' status already exists for ${card2to1.have.name} and ${card1to2.have.name}`);
            continue;
          }

          // Apply the pending check *for each pair*
          const isAlreadyPendingForCards = pendingMatches.some(pm =>
            ((pm.user1_id === trade1.user_id && pm.user2_id === trade2.user_id) || (pm.user1_id === trade2.user_id && pm.user2_id === trade1.user_id)) &&
            pm.user1_cards.some(card => card.id === card2to1.have.id) && // Corrected: User1 gives card2to1.have
            pm.user2_cards.some(card => card.id === card1to2.have.id)    // Corrected: User2 gives card1to2.have
          );

          if (isAlreadyPendingForCards) {
            console.log(`    Skipping: Already pending match for ${card2to1.have.name} and ${card1to2.have.name}`);
            continue;
          }

          console.log(`    Potential trade match found between User ${trade1.user_id} and User ${trade2.user_id}`);
          console.log(`      Inserting trade match for cards: User1 gives ${card2to1.have.name}, User2 gives ${card1to2.have.name}`);

          try {
            const { error: insertError } = await supabase
              .from('trade_matches')
              .insert([
                {
                  user1_id: trade1.user_id,
                  user2_id: trade2.user_id,
                  user1_cards: [card2to1.have], // Corrected: User1 gives card2to1.have
                  user2_cards: [card1to2.have], // Corrected: User2 gives card1to2.have
                  status: 'pending',
                },
              ]);

            if (insertError) {
              console.error('Error inserting trade match:', insertError);
            } else {
              console.log('      Trade match inserted successfully for card pair');
            }
          } catch (err) {
            console.error('An unexpected error occurred during insert:', err);
          }
        }
      }
    }
  }
  console.log('Trade matching check complete.');
}

async function checkExistingRequestSent(user1_id, user2_id, card1, card2) {
  try {
    const { data, error } = await supabase
      .from('trade_matches')
      .select('*')
      .in('status', ['request sent', 'confirmed', 'completed']) // Modifica qui per includere più status
      .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`);

    if (error) {
      console.error('Error checking for existing trades with statuses request sent, confirmed, completed:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false; // Nessun trade trovato con gli status specificati per questi utenti
    }

    // Verifica se uno dei trade esistenti ha le stesse carte
    const existingTrade = data.some(trade => {
      const tradeUser1Cards = trade.user1_cards;
      const tradeUser2Cards = trade.user2_cards;

      // Verifica se le carte corrispondono in entrambe le direzioni
      const cardsMatch = (
        (tradeUser1Cards.some(c => c.id === card1.id && c.rarity === card1.rarity) && tradeUser2Cards.some(c => c.id === card2.id && c.rarity === card2.rarity)) ||
        (tradeUser1Cards.some(c => c.id === card2.id && c.rarity === card2.rarity) && tradeUser2Cards.some(c => c.id === card1.id && c.rarity === card1.rarity))
      );
      return cardsMatch;
    });

    return existingTrade;

  } catch (error) {
    console.error('Unexpected error checking for existing trades:', error);
    return false;
  }
}


async function checkTradeMatches() {
  try {
    const { data: pending, error: pendingError } = await supabase
      .from('trade_matches')
      .select('user1_id, user2_id, user1_cards, user2_cards')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending trade matches:', pendingError);
      return;
    }

    const { data: trades, error: tradesError } = await supabase
      .from('trade_cards')
      .select('*');

    if (tradesError) {
      console.error('Error fetching trade cards:', tradesError);
      return;
    }

    await matchTrades(trades, pending || []);

  } catch (err) {
    console.error('An unexpected error occurred:', err);
  }
}

function keepServerAlive() {
  const serverUrl = 'https://lbdb-server-trade.onrender.com'; // Assicurati che sia l'URL corretto del tuo server
  fetch(serverUrl)
    .then(response => {
      if (response.ok) {
        console.log('Keep-alive ping sent successfully.');
      } else {
        console.log('Keep-alive ping failed, server might be down.');
      }
    })
    .catch(error => {
      console.error('Error sending keep-alive ping:', error);
    });
}

setInterval(checkTradeMatches, POLLING_INTERVAL);
setInterval(keepServerAlive, keepAliveInterval);
keepServerAlive(); // Esegui una prima volta all'avvio
console.log(`Started polling trade_cards every ${POLLING_INTERVAL / 1000} seconds.`);
console.log(`Started keep-alive ping every ${keepAliveInterval / 1000} seconds.`);
