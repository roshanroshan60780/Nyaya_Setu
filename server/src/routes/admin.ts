import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest, Complaint, User } from '../types';
import { createAuditEntry } from '../utils/audit';
import { createNotification } from '../utils/notifications';
import { checkAndEscalateOverdue } from '../utils/escalation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/admin/dashboard
 * Returns dashboard statistics: totals, breakdowns by status/category/priority,
 * average resolution time, and recent complaints.
 */
router.get('/dashboard', (req: AuthenticatedRequest, res: Response): void => {
  try {
    // Total complaints
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as { count: number };

    // By status
    const byStatusRows = db.prepare(
      'SELECT status, COUNT(*) as count FROM complaints GROUP BY status'
    ).all() as { status: string; count: number }[];
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = row.count;
    }

    // By category
    const byCategoryRows = db.prepare(
      'SELECT category, COUNT(*) as count FROM complaints GROUP BY category'
    ).all() as { category: string; count: number }[];
    const byCategory: Record<string, number> = {};
    for (const row of byCategoryRows) {
      byCategory[row.category] = row.count;
    }

    // By priority
    const byPriorityRows = db.prepare(
      'SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority'
    ).all() as { priority: string; count: number }[];
    const byPriority: Record<string, number> = {};
    for (const row of byPriorityRows) {
      byPriority[row.priority] = row.count;
    }

    // Average resolution time (for resolved/closed complaints)
    const avgResolution = db.prepare(
      `SELECT AVG(
        (julianday(updated_at) - julianday(created_at)) * 24
      ) as avg_hours
      FROM complaints
      WHERE status IN ('resolved', 'closed')`
    ).get() as { avg_hours: number | null };

    // Recent complaints (last 10)
    const recentComplaints = db.prepare(
      `SELECT c.*, u.name as user_name
       FROM complaints c
       LEFT JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 10`
    ).all();

    res.json({
      totalComplaints: totalResult.count,
      byStatus,
      byCategory,
      byPriority,
      avgResolutionTimeHours: avgResolution.avg_hours
        ? Math.round(avgResolution.avg_hours * 100) / 100
        : null,
      recentComplaints,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

/** Zod schema for assigning a complaint */
const assignSchema = z.object({
  assigned_to: z.number().int().positive('Invalid admin user ID'),
});

/**
 * PUT /api/admin/complaints/:id/assign
 * Assign a complaint to an admin user.
 */
router.put('/complaints/:id/assign', validate(assignSchema), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const { assigned_to } = req.body;

    // Verify the assignee is an admin user
    const assignee = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'admin'").get(assigned_to) as Pick<User, 'id' | 'name'> | undefined;
    if (!assignee) {
      res.status(400).json({ error: 'Assignee must be a valid admin user.' });
      return;
    }

    db.prepare(
      "UPDATE complaints SET assigned_to = ?, status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END, updated_at = datetime('now') WHERE id = ?"
    ).run(assigned_to, complaintId);

    // Audit trail
    createAuditEntry(complaintId, req.user!.id, 'complaint_assigned', JSON.stringify({
      assigned_to: assigned_to,
      assigned_to_name: assignee.name,
      assigned_by: req.user!.name,
    }));

    // Notify the assignee
    createNotification(
      assigned_to,
      complaintId,
      `Complaint #${complaintId} "${complaint.title}" has been assigned to you.`,
      'info'
    );

    // Notify the complaint owner
    createNotification(
      complaint.user_id,
      complaintId,
      `Your complaint "${complaint.title}" has been assigned to ${assignee.name}.`,
      'info'
    );

    const updatedComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.json({
      message: 'Complaint assigned successfully.',
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ error: 'Failed to assign complaint.' });
  }
});

/** Zod schema for changing complaint status */
const statusChangeSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'escalated']),
  resolution_notes: z.string().max(5000).optional(),
});

/**
 * PUT /api/admin/complaints/:id/status
 * Change the status of a complaint with optional resolution notes.
 */
router.put('/complaints/:id/status', validate(statusChangeSchema), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const { status, resolution_notes } = req.body;

    const updateFields = ["status = ?", "updated_at = datetime('now')"];
    const updateValues: any[] = [status];

    if (resolution_notes !== undefined) {
      updateFields.push('resolution_notes = ?');
      updateValues.push(resolution_notes);
    }

    updateValues.push(complaintId);

    db.prepare(
      `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`
    ).run(...updateValues);

    // Audit trail
    createAuditEntry(complaintId, req.user!.id, 'status_changed', JSON.stringify({
      from: complaint.status,
      to: status,
      resolution_notes: resolution_notes || null,
      changed_by: req.user!.name,
    }));

    // Notify complaint owner
    let notificationType: 'info' | 'success' | 'warning' = 'info';
    if (status === 'resolved') notificationType = 'success';
    if (status === 'escalated') notificationType = 'warning';

    createNotification(
      complaint.user_id,
      complaintId,
      `Your complaint "${complaint.title}" status changed from "${complaint.status}" to "${status}".${resolution_notes ? ' Notes: ' + resolution_notes : ''}`,
      notificationType
    );

    const updatedComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.json({
      message: 'Complaint status updated successfully.',
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Change status error:', error);
    res.status(500).json({ error: 'Failed to change complaint status.' });
  }
});

/**
 * PUT /api/admin/complaints/:id/escalate
 * Manually escalate a complaint.
 */
router.put('/complaints/:id/escalate', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId) as Complaint | undefined;
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    if (complaint.status === 'escalated') {
      res.status(400).json({ error: 'Complaint is already escalated.' });
      return;
    }

    if (complaint.status === 'closed' || complaint.status === 'resolved') {
      res.status(400).json({ error: 'Cannot escalate a resolved or closed complaint.' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(
      "UPDATE complaints SET status = 'escalated', escalated_at = ?, updated_at = ? WHERE id = ?"
    ).run(now, now, complaintId);

    // Audit trail
    createAuditEntry(complaintId, req.user!.id, 'manually_escalated', JSON.stringify({
      previous_status: complaint.status,
      escalated_by: req.user!.name,
    }));

    // Notify the complaint owner
    createNotification(
      complaint.user_id,
      complaintId,
      `Your complaint "${complaint.title}" has been escalated for higher priority attention.`,
      'warning'
    );

    // Notify all other admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND id != ?").all(req.user!.id) as Pick<User, 'id'>[];
    for (const admin of admins) {
      createNotification(
        admin.id,
        complaintId,
        `Complaint #${complaintId} "${complaint.title}" has been escalated by ${req.user!.name}.`,
        'warning'
      );
    }

    const updatedComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.json({
      message: 'Complaint escalated successfully.',
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Escalate complaint error:', error);
    res.status(500).json({ error: 'Failed to escalate complaint.' });
  }
});

/**
 * GET /api/admin/analytics
 * Returns anonymized analytics data (no PII):
 * - Complaint trends by month
 * - Category distribution
 * - Resolution rates
 * - Average resolution times by category
 */
router.get('/analytics', (req: AuthenticatedRequest, res: Response): void => {
  try {
    // Complaint trends by month (last 12 months)
    const trendsByMonth = db.prepare(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM complaints
       WHERE created_at >= datetime('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`
    ).all() as { month: string; count: number }[];

    // Category distribution
    const categoryDistribution = db.prepare(
      'SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC'
    ).all() as { category: string; count: number }[];

    // Resolution rates
    const totalComplaints = db.prepare('SELECT COUNT(*) as count FROM complaints').get() as { count: number };
    const resolvedComplaints = db.prepare(
      "SELECT COUNT(*) as count FROM complaints WHERE status IN ('resolved', 'closed')"
    ).get() as { count: number };

    const resolutionRates = {
      resolved: resolvedComplaints.count,
      total: totalComplaints.count,
      rate: totalComplaints.count > 0
        ? Math.round((resolvedComplaints.count / totalComplaints.count) * 10000) / 100
        : 0,
    };

    // Average resolution times by category
    const avgTimesByCategory = db.prepare(
      `SELECT category,
              AVG((julianday(updated_at) - julianday(created_at)) * 24) as avgHours
       FROM complaints
       WHERE status IN ('resolved', 'closed')
       GROUP BY category
       ORDER BY avgHours DESC`
    ).all() as { category: string; avgHours: number }[];

    // Round avgHours
    const formattedAvgTimes = avgTimesByCategory.map((row) => ({
      category: row.category,
      avgHours: Math.round(row.avgHours * 100) / 100,
    }));

    res.json({
      trendsByMonth,
      categoryDistribution,
      resolutionRates,
      avgTimesByCategory: formattedAvgTimes,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

/**
 * POST /api/admin/check-escalations
 * Trigger auto-escalation check for overdue complaints.
 * Complaints open/in_progress for more than ESCALATION_DAYS without update are escalated.
 */
router.post('/check-escalations', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const escalatedCount = checkAndEscalateOverdue();

    res.json({
      message: escalatedCount > 0
        ? `${escalatedCount} complaint(s) have been auto-escalated.`
        : 'No overdue complaints found.',
      escalatedCount,
    });
  } catch (error) {
    console.error('Check escalations error:', error);
    res.status(500).json({ error: 'Failed to check escalations.' });
  }
});

export default router;
