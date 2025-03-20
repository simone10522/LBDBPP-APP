const express = require('express');
const { Expo } = require('expo-server-sdk');
const cors = require('cors');

const app = express();
const port = 3000;

let expo = new Expo();

app.use(express.json());
app.use(cors());

app.post('/send-notification', async (req, res) => {
  const { pushToken, message, userId } = req.body; // Ricevi anche userId

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} non è un push token Expo valido.`);
    return res.status(400).send({ error: 'Push token non valido' });
  }

  const notificationMessage = {
    to: pushToken,
    sound: 'default',
    title: 'Notifica Match!',
    body: message,
    data: {
      userId: userId, // Includi l'ID utente nel payload
      withSome: 'data'
    },
  };

  try {
    console.log("Push token inviato:", pushToken);
    console.log("User ID incluso nella notifica:", userId); // LOG USER ID
    let ticket = await expo.sendPushNotificationsAsync([notificationMessage]);
    console.log("Ticket di risposta da Expo:", ticket);
    return res.send({ success: true, ticket });
  } catch (error) {
    console.error('Errore durante l\'invio della notifica:', error);
    return res.status(500).send({ error: 'Errore nell\'invio della notifica', details: error });
  }
});

app.get('/test', (req, res) => {
  res.send('Backend connesso correttamente! (Test endpoint)');
});

app.get('/keep-alive', (req, res) => {
  res.send('Server is alive!');
});


app.listen(port, () => {
  console.log(`Server backend in ascolto sulla porta ${port}`);
});
