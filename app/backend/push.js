const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json'); // Path to the service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Sends a push notification using Firebase Cloud Messaging.
 * @param {Object} options - Notification options.
 * @param {string} options.pushToken - The recipient's push token.
 * @param {string} options.message - The notification message body.
 * @param {string} [options.title] - The notification title.
 * @param {string} [options.notificationType] - The type of notification (e.g., 'match', 'chat').
 * @param {Object} [options.data] - Additional data to include in the notification.
 * @returns {Promise<Object>} - The Firebase response or an error object.
 */
async function sendPushNotification({ pushToken, message, title = 'Notification', notificationType = 'default', data = {} }) {
  if (!pushToken) {
    throw new Error('Push token is required');
  }

  let notificationMessage = {
    token: pushToken,
    data: {
      ...data,
      notificationType,
    },
    notification: {
      title,
      body: message,
    },
  };

  // Customize notification based on type
  if (notificationType === 'match' || notificationType === 'chat') {
    notificationMessage.android = {
      priority: 'high',
      notification: {
        channelId: `${notificationType}-notifications`,
        sound: 'default',
        priority: 'high',
        vibrateTimingsMillis: [0, 250, 250, 250],
      },
    };
    notificationMessage.apns = {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    };
  }

  try {
    const response = await admin.messaging().send(notificationMessage);
    console.log('Successfully sent message:', response);
    return { success: true, firebaseResponse: response };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPushNotification };
