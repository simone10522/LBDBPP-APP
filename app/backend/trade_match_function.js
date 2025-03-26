const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// In-memory throttle: la funzione sarà eseguita non più di 1 volta al minuto.
let lastExecuted = 0;
const THROTTLE_MS = 60000;

async function matchTrades() {
  // ...existing trading logic, adattato a una funzione unica...
  console.log("Eseguo il match dei trade...");
  // recupera i trade_cards e i trade_matches necessari e applica la logica 
  // (inserisci qui il codice della funzione matchTrades sopra, rimuovendo i setInterval)
}

module.exports = async (req, res) => {
  const now = Date.now();
  if (now - lastExecuted < THROTTLE_MS) {
    return res.status(429).json({ error: "Too Many Requests: wait a moment before calling again." });
  }
  lastExecuted = now;
  try {
    await matchTrades();
    res.status(200).json({ message: "Trade matching completed." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
