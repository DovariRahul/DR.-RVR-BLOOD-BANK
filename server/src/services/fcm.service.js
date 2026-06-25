const admin = require('firebase-admin');
const { query } = require('../config/db');
const { logger } = require('../utils/logger');

// Initialize Firebase Admin
let isFirebaseInitialized = false;

function initFirebase() {
  if (isFirebaseInitialized) return true;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFirebaseInitialized = true;
      logger.info('Firebase Admin initialized successfully.');
    } else {
      logger.warn('FIREBASE_SERVICE_ACCOUNT not configured. FCM notifications will be simulated.');
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error.message);
  }
  
  return isFirebaseInitialized;
}

initFirebase();

/**
 * Log notification to database
 */
async function logNotification(userId, requestId, message, status, externalId = null) {
  try {
    await query(
      `INSERT INTO notifications_log (recipient_id, type, related_request, message_body, status, external_id)
       VALUES (?, 'push', ?, ?, ?, ?)`,
      [userId, requestId, message, status, externalId]
    );
  } catch (err) {
    logger.error(`Failed to log notification for user ${userId}:`, err.message);
  }
}

/**
 * Send a generic push notification to a user's FCM token.
 */
async function sendPushNotification(user, title, body, data = {}) {
  if (!user.fcm_token) {
    logger.info(`User ${user.id} has no FCM token. Cannot send push notification.`);
    return false;
  }

  if (!isFirebaseInitialized) {
    logger.info(`[SIMULATED PUSH] To: ${user.full_name} | Title: ${title} | Body: ${body}`);
    await logNotification(user.id, data.requestId || null, body, 'delivered', 'simulated_fcm');
    return true;
  }

  const message = {
    notification: { title, body },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' // Optional: for client routing
    },
    token: user.fcm_token
  };

  if (data.link) {
    message.webpush = {
      fcmOptions: {
        link: data.link
      }
    };
  }

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent successfully to user ${user.id}. Message ID: ${response}`);
    await logNotification(user.id, data.requestId || null, body, 'sent', response);
    return true;
  } catch (error) {
    logger.error(`Error sending push notification to user ${user.id}:`, error);
    await logNotification(user.id, data.requestId || null, body, 'failed', null);
    
    // If token is invalid, clear it from DB
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      await query('UPDATE users SET fcm_token = NULL WHERE id = ?', [user.id]);
      logger.info(`Cleared invalid FCM token for user ${user.id}`);
    }
    
    return false;
  }
}

/**
 * Notify a donor about a new blood request match.
 */
async function sendDonorNotification(donor, request) {
  const urgencyLabel = request.urgency.toUpperCase();
  const title = `🚨 ${urgencyLabel} Blood Request: ${request.blood_group_needed}`;
  const body = `Hi ${donor.full_name}, an urgent request for ${request.blood_group_needed} blood at ${request.hospital_name} (${request.hospital_city}) needs your help. Tap to view and respond!`;
  
  const data = {
    type: 'blood_request',
    requestId: request.id.toString(),
    urgency: request.urgency,
    link: `${process.env.CLIENT_URL || 'http://localhost:5173'}/request/${request.id}/status`
  };

  const sent = await sendPushNotification(donor, title, body, data);

  // Still log the donor_response row so we can track their response state
  try {
    await query(
      `INSERT INTO donor_responses (request_id, donor_id, sms_status, sms_sid)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sms_status = VALUES(sms_status), sms_sid = VALUES(sms_sid), sms_sent_at = CURRENT_TIMESTAMP`,
      [request.id, donor.id, sent ? 'sent' : 'failed', sent ? 'fcm_push' : null]
    );
  } catch (err) {
    logger.error(`Failed to log donor_response for donor ${donor.id}:`, err.message);
  }

  return sent;
}

/**
 * Send confirmation to a donor when they accept a request.
 */
async function sendAcceptanceConfirmation(donor, request) {
  const title = 'Thank You for Accepting! ❤️';
  const body = `Thank you, ${donor.full_name}! Please proceed to ${request.hospital_name}. Contact: ${request.contact_name} at ${request.contact_phone}.`;
  
  return await sendPushNotification(donor, title, body, { type: 'acceptance_confirmation', requestId: request.id.toString() });
}

/**
 * Notify the requester when a donor accepts.
 */
async function sendSeekerNotification(request, donor) {
  // We need to fetch the requester's FCM token to send them a push
  const [requester] = await query('SELECT id, full_name, fcm_token FROM users WHERE id = ?', [request.requester_id]);
  if (!requester) return false;

  const title = 'Good News! Donor Found 🩸';
  const body = `${donor.full_name} (${donor.blood_group}) has accepted your blood request for ${request.hospital_name} and is on their way.`;
  
  return await sendPushNotification(requester, title, body, { type: 'donor_accepted', requestId: request.id.toString() });
}

module.exports = {
  sendPushNotification,
  sendDonorNotification,
  sendAcceptanceConfirmation,
  sendSeekerNotification
};
