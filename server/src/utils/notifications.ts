import db from '../db/database';

/**
 * Creates a notification for a user.
 * Used to alert users about complaint status changes, new comments,
 * escalations, and other events.
 *
 * @param userId - ID of the user to notify
 * @param complaintId - ID of the related complaint (null for system notifications)
 * @param message - Human-readable notification message
 * @param type - Notification severity: 'info', 'warning', 'success', or 'error'
 */
export function createNotification(
  userId: number,
  complaintId: number | null,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info'
): void {
  db.prepare(
    `INSERT INTO notifications (user_id, complaint_id, message, type)
     VALUES (?, ?, ?, ?)`
  ).run(userId, complaintId, message, type);
}
