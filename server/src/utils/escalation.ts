import db from '../db/database';
import { Complaint, User } from '../types';
import { createAuditEntry } from './audit';
import { createNotification } from './notifications';

/**
 * Default number of days without an update before a complaint is auto-escalated.
 * Can be overridden via the ESCALATION_DAYS environment variable.
 */
const ESCALATION_DAYS = parseInt(process.env.ESCALATION_DAYS || '7', 10);

/**
 * Checks for overdue complaints and automatically escalates them.
 * A complaint is considered overdue if it has been in 'open' or 'in_progress'
 * status for more than ESCALATION_DAYS without any update to updated_at.
 *
 * For each overdue complaint:
 * 1. Status is changed to 'escalated' and escalated_at is set
 * 2. The complaint owner is notified
 * 3. All admin users are notified
 * 4. An audit trail entry is created
 *
 * @returns The number of complaints that were escalated
 */
export function checkAndEscalateOverdue(): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ESCALATION_DAYS);
  const cutoffStr = cutoffDate.toISOString().replace('T', ' ').substring(0, 19);

  // Find complaints that are open or in_progress and haven't been updated within the threshold
  const overdueComplaints = db.prepare(
    `SELECT * FROM complaints
     WHERE status IN ('open', 'in_progress')
     AND updated_at <= ?`
  ).all(cutoffStr) as Complaint[];

  if (overdueComplaints.length === 0) {
    return 0;
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Get all admin users for notification
  const admins = db.prepare(
    "SELECT id FROM users WHERE role = 'admin'"
  ).all() as Pick<User, 'id'>[];

  const updateStmt = db.prepare(
    `UPDATE complaints
     SET status = 'escalated', escalated_at = ?, updated_at = ?
     WHERE id = ?`
  );

  let escalatedCount = 0;

  const escalateTransaction = db.transaction(() => {
    for (const complaint of overdueComplaints) {
      updateStmt.run(now, now, complaint.id);

      // Notify the complaint owner
      createNotification(
        complaint.user_id,
        complaint.id,
        `Your complaint "${complaint.title}" has been auto-escalated due to no activity for ${ESCALATION_DAYS}+ days.`,
        'warning'
      );

      // Notify all admins
      for (const admin of admins) {
        createNotification(
          admin.id,
          complaint.id,
          `Complaint #${complaint.id} "${complaint.title}" has been auto-escalated (no activity for ${ESCALATION_DAYS}+ days).`,
          'warning'
        );
      }

      // Create audit trail entry (use user_id 0 or system user - we use the complaint owner)
      createAuditEntry(
        complaint.id,
        complaint.user_id,
        'auto_escalated',
        JSON.stringify({
          reason: `No activity for ${ESCALATION_DAYS}+ days`,
          previous_status: complaint.status,
          escalated_at: now
        })
      );

      escalatedCount++;
    }
  });

  escalateTransaction();

  return escalatedCount;
}
