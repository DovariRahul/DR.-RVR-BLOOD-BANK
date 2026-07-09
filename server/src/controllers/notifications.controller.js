const { query, queryOne } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user, newest first.
 * Also returns the unread count.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const notifications = await query(
    `SELECT * FROM user_notifications
     WHERE recipient_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  res.json({
    success: true,
    data: {
      notifications,
      unread_count: unreadCount
    }
  });
});

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint used by Navbar polling.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await queryOne(
    `SELECT COUNT(*) as count FROM user_notifications
     WHERE recipient_id = ? AND is_read = 0`,
    [userId]
  );

  res.json({
    success: true,
    data: { unread_count: result.count }
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await queryOne(
    'SELECT * FROM user_notifications WHERE id = ?',
    [id]
  );

  if (!notification) throw new NotFoundError('Notification');

  if (notification.recipient_id !== userId) {
    throw new ForbiddenError('You can only mark your own notifications as read.');
  }

  await query(
    'UPDATE user_notifications SET is_read = 1 WHERE id = ?',
    [id]
  );

  res.json({ success: true, message: 'Notification marked as read.' });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the logged-in user as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await query(
    'UPDATE user_notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0',
    [userId]
  );

  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
