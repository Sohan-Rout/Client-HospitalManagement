const { all, run } = require("../config/db");
const {
  canViewCriticalEmergency,
  safeJsonParse,
  uniqueIds
} = require("../utils/portal");

async function createNotifications(userIds, payload) {
  const recipients = uniqueIds(userIds);

  for (const userId of recipients) {
    await run(
      `INSERT INTO portal_notifications (
        user_id,
        type,
        severity,
        title,
        body,
        meta_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.type || "system",
        payload.severity || "low",
        payload.title || "System update",
        payload.body || "",
        JSON.stringify(payload.meta || {})
      ]
    );
  }
}

async function fetchNotifications(currentUser) {
  const rows = await all(
    `SELECT
      id,
      type,
      severity,
      title,
      body,
      meta_json,
      is_read,
      created_at
    FROM portal_notifications
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 30`,
    [currentUser.id]
  );

  return rows
    .filter(
      (row) =>
        !(
          currentUser.role === "nurse" &&
          row.type === "emergency"
        ) &&
        !(
          row.type === "emergency" &&
          row.severity === "critical" &&
          !canViewCriticalEmergency(currentUser)
        )
    )
    .map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      body: row.body,
      meta: safeJsonParse(row.meta_json, {}) || {},
      isRead: Boolean(row.is_read),
      createdAt: row.created_at
    }));
}

async function markNotificationRead(notificationId, userId) {
  return run(
    `UPDATE portal_notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

async function markAllNotificationsRead(userId) {
  return run(
    `UPDATE portal_notifications
    SET is_read = 1
    WHERE user_id = ?`,
    [userId]
  );
}

module.exports = {
  createNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
