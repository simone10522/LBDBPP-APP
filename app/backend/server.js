const express = require('express');
const { Expo } = require('expo-server-sdk');
const cors = require('cors');
const admin = require('firebase-admin'); // Firebase Admin SDK
const http = require('http');

const app = express();
const port = process.env.PORT || 3000; // Re-add the port definition

// Inizializza Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // Path al file della service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

let expo = new Expo();

app.use(express.json());
app.use(cors());

// Endpoint per inviare notifiche push tramite Firebase
app.post('/send-notification', async (req, res) => {
  const { pushToken, message, userId, notificationType, title } = req.body;

  if (!pushToken) {
    return res.status(400).send({ error: 'Push token is required' });
  }

  let notificationMessage = {
    token: pushToken,
    data: {
      userId: userId,
      notificationType: notificationType || 'default',
    },
  };

  // Configura la notifica in base al tipo
  switch (notificationType) {
    case 'match':
      notificationMessage = {
        ...notificationMessage,
        notification: {
          title: 'Notifica Match!',
          body: message,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'match-notifications',
            sound: 'default',
            priority: 'high',
            vibrateTimingsMillis: [0, 250, 250, 250]
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };
      break;

    case 'chat':
      notificationMessage = {
        ...notificationMessage,
        notification: {
          title: title || 'Nuovo messaggio',
          body: message,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'chat-notifications',
            sound: 'default',
            priority: 'high',
            vibrateTimingsMillis: [0, 250, 250, 250]
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };
      break;

    default:
      notificationMessage = {
        ...notificationMessage,
        notification: {
          title: title || 'Notifica',
          body: message,
        }
      };
  }

  try {
    console.log("Invio notifica di tipo:", notificationType);
    console.log("Firebase push token:", pushToken);
    console.log("User ID:", userId);

    // Invia la notifica a Firebase Cloud Messaging
    const response = await admin.messaging().send(notificationMessage);
    console.log('Successfully sent message:', response);

    return res.send({ success: true, firebaseResponse: response });
  } catch (error) {
    console.error('Errore durante l\'invio della notifica tramite Firebase:', error);
    return res.status(500).send({ error: 'Errore nell\'invio della notifica tramite Firebase', details: error });
  }
});

// Endpoint di test
app.get('/test', (req, res) => {
  res.send('Backend connesso correttamente! (Test endpoint)');
});

// Endpoint per il ping (Render Keep-Alive)
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Funzione Keep-Alive per evitare la sospensione su Render
// function keepServerAlive() {
//   const serverUrl = `https://lbdb-server.onrender.com/ping`; // **URL CORRETTO CON /ping**
//   fetch(serverUrl)
//     .then(response => {
//       if (response.ok) {
//         console.log('Keep-alive ping sent successfully.');
//       } else {
//         console.log('Keep-alive ping failed, server might be down.');
//       }
//     })
//     .catch(error => {
//       console.error('Error sending keep-alive ping:', error);
//     });
// }

// Avvia il Keep-Alive
// keepServerAlive();

// Avvio del server
app.listen(port, () => {
  console.log(`Server backend in ascolto sulla porta ${port}`);
});

// Disabilita il setInterval per il Keep-Alive
// const keepAliveInterval = 30000; // Imposta a 1 secondo (1000 millisecondi)
// setInterval(keepServerAlive, keepAliveInterval);