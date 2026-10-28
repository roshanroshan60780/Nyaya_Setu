import { Router, Request, Response } from 'express';
import db from '../db/database';
import { PublicStats } from '../types';

const router = Router();

/**
 * GET /api/public/stats
 * Public endpoint delivering aggregate grievance statistics without requiring authentication.
 * 
 * Strict Privacy & Anonymity Guarantees:
 * - Employs pure SQL aggregations (COUNT, SUM) directly inside the database engine.
 * - Zero access to or transmission of PII (no student names, emails, descriptions, attachments).
 * - Handles empty database states gracefully without division-by-zero errors.
 */
router.get('/stats', (_req: Request, res: Response): void => {
  try {
    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN status = 'escalated' THEN 1 ELSE 0 END) AS escalated
      FROM complaints
    `).get() as {
      total: number;
      pending: number | null;
      in_progress: number | null;
      resolved: number | null;
      closed: number | null;
      escalated: number | null;
    } | undefined;

    const total = statsRow?.total || 0;
    const pending = statsRow?.pending || 0;
    const inProgress = statsRow?.in_progress || 0;
    const resolved = statsRow?.resolved || 0;
    const closed = statsRow?.closed || 0;
    const escalated = statsRow?.escalated || 0;

    // Documented formula: (Resolved + Closed) / Total * 100. Handles total = 0 safely.
    const resolutionRate = total > 0
      ? Math.round(((resolved + closed) / total) * 1000) / 10
      : 0;

    // Aggregate by category for public transparency breakdown
    const categoryRows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM complaints 
      GROUP BY category 
      ORDER BY count DESC
    `).all() as { category: string; count: number }[];

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const publicStats: PublicStats = {
      totalComplaints: total,
      pendingComplaints: pending,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
      closedComplaints: closed,
      escalatedComplaints: escalated,
      resolutionRate,
      byCategory,
      pendingDefinition: "Pending complaints are registered grievances currently in 'open' status awaiting initial verification and officer assignment.",
      resolutionFormula: "Resolution Rate = ((Resolved Complaints + Closed Complaints) / Total Complaints) × 100",
      lastUpdated: new Date().toISOString(),
    };

    res.json(publicStats);
  } catch (error) {
    console.error('Public stats query error:', error);
    res.status(500).json({ error: 'Failed to fetch public statistics.' });
  }
});

export default router;
