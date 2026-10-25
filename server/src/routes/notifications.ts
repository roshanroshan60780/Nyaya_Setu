import { Router, Response } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest, Notification } from '../types';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * List notifications for the current user.
 * Supports pagination and filtering by read/unread status.
 *
 * Query params:
 *   page (default 1), limit (default 20), unread ('true' to filter unread only)
 */
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [req.user!.id];

    if (unreadOnly) {
      whereClause += ' AND is_read = 0';
    }

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`
    ).get(...params) as { count: number };

    const notifications = db.prepare(
      `SELECT * FROM notifications ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as Notification[];

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
      },
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications for the current user.
 */
router.get('/unread-count', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(req.user!.id) as { count: number };

    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the current user.
 */
router.put('/read-all', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).run(req.user!.id);

    res.json({
      message: 'All notifications marked as read.',
      updated: result.changes,
    });
  } catch (error) {
    console.error('Read all notifications error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 * Users can only mark their own notifications.
 */
router.put('/:id/read', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const notificationId = parseInt(req.params.id as string);

    if (isNaN(notificationId)) {
      res.status(400).json({ error: 'Invalid notification ID.' });
      return;
    }

    // Verify the notification belongs to the current user
    const notification = db.prepare(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
    ).get(notificationId, req.user!.id) as Notification | undefined;

    if (!notification) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

export default router;
