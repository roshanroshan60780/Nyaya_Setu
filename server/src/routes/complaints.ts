import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../db/database';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest, Complaint, Comment, Attachment, User } from '../types';
import { createAuditEntry, verifyAuditChain } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/** Allowed MIME types for file uploads */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Max file size: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Multer storage configuration.
 * Files are saved with UUID filenames to prevent collisions and path traversal.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

/**
 * Multer upload middleware with file type and size validation.
 */
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: images, PDF, DOC/DOCX.`));
    }
  },
});

// All complaint routes require authentication
router.use(authenticate);

/** Zod schema for creating a complaint */
const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description too long'),
  category: z.enum(['academic', 'infrastructure', 'administrative', 'hostel', 'financial', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
});

/** Zod schema for updating a complaint */
const updateComplaintSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: z.enum(['academic', 'infrastructure', 'administrative', 'hostel', 'financial', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'escalated']).optional(),
  resolution_notes: z.string().max(5000).optional(),
});

/** Zod schema for adding a comment */
const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
});

/**
 * GET /api/complaints
 * List complaints with filtering, search, sorting, and pagination.
 * Students see only their own complaints; admins see all.
 *
 * Query params: status, category, priority, search, page, limit, sortBy, sortOrder
 */
router.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    const allowedSortColumns = ['id', 'title', 'category', 'priority', 'status', 'created_at', 'updated_at'];
    const sortBy = allowedSortColumns.includes(req.query.sortBy as string)
      ? (req.query.sortBy as string)
      : 'created_at';
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereConditions: string[] = [];
    let params: any[] = [];

    // Students can only see their own complaints
    if (req.user!.role === 'student') {
      whereConditions.push('c.user_id = ?');
      params.push(req.user!.id);
    }

    // Apply filters
    if (req.query.status) {
      whereConditions.push('c.status = ?');
      params.push(req.query.status);
    }
    if (req.query.category) {
      whereConditions.push('c.category = ?');
      params.push(req.query.category);
    }
    if (req.query.priority) {
      whereConditions.push('c.priority = ?');
      params.push(req.query.priority);
    }
    if (req.query.search) {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = db.prepare(
      `SELECT COUNT(*) as count FROM complaints c ${whereClause}`
    ).get(...params) as { count: number };

    // Get paginated results with user info
    const complaints = db.prepare(
      `SELECT c.*, u.name as user_name, u.email as user_email,
              a.name as assigned_to_name
       FROM complaints c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users a ON c.assigned_to = a.id
       ${whereClause}
       ORDER BY c.${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      complaints,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    });
  } catch (error) {
    console.error('List complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

/**
 * GET /api/complaints/:id
 * Get complaint details including comments and attachments.
 * Students can only view their own complaints; admins can view any.
 */
router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare(
      `SELECT c.*, u.name as user_name, u.email as user_email,
              a.name as assigned_to_name
       FROM complaints c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN users a ON c.assigned_to = a.id
       WHERE c.id = ?`
    ).get(complaintId) as (Complaint & { user_name: string; user_email: string }) | undefined;

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Authorization: students can only view their own complaints
    if (req.user!.role === 'student' && complaint.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Fetch comments with user info
    const comments = db.prepare(
      `SELECT cm.*, u.name as user_name, u.role as user_role
       FROM comments cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.complaint_id = ?
       ORDER BY cm.created_at ASC`
    ).all(complaintId);

    // Fetch attachments
    const attachments = db.prepare(
      'SELECT * FROM attachments WHERE complaint_id = ? ORDER BY uploaded_at ASC'
    ).all(complaintId);

    res.json({
      complaint,
      comments,
      attachments,
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint.' });
  }
});

/**
 * POST /api/complaints
 * Create a new complaint, optionally with file attachments.
 * Accepts multipart/form-data with up to 5 files in the 'attachments' field.
 */
router.post('/', upload.array('attachments', 5), (req: AuthenticatedRequest, res: Response): void => {
  try {
    // Validate the body fields with Zod
    const parseResult = createComplaintSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const { title, description, category, priority } = parseResult.data;

    const result = db.prepare(
      `INSERT INTO complaints (user_id, title, description, category, priority)
       VALUES (?, ?, ?, ?, ?)`
    ).run(req.user!.id, title, description, category, priority);

    const complaintId = result.lastInsertRowid as number;

    // Handle file attachments
    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const insertAttachment = db.prepare(
        `INSERT INTO attachments (complaint_id, filename, original_name, mime_type, size)
         VALUES (?, ?, ?, ?, ?)`
      );

      for (const file of files) {
        insertAttachment.run(
          complaintId,
          file.filename,
          file.originalname,
          file.mimetype,
          file.size
        );
      }
    }

    // Create audit trail entry
    createAuditEntry(complaintId, req.user!.id, 'complaint_created', JSON.stringify({
      title,
      category,
      priority,
    }));

    // Notify all admins about the new complaint
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as Pick<User, 'id'>[];
    for (const admin of admins) {
      createNotification(
        admin.id,
        complaintId,
        `New ${priority} priority complaint filed: "${title}" in ${category} category.`,
        priority === 'critical' ? 'warning' : 'info'
      );
    }

    // Fetch the created complaint
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint,
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

/**
 * PUT /api/complaints/:id
 * Update a complaint.
 * Students can update only their own open complaints (title, description, category, priority).
 * Admins can update any complaint including status and resolution notes.
 */
router.put('/:id', validate(updateComplaintSchema), (req: AuthenticatedRequest, res: Response): void => {
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

    // Authorization checks
    if (req.user!.role === 'student') {
      if (complaint.user_id !== req.user!.id) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
      if (complaint.status !== 'open') {
        res.status(400).json({ error: 'Only open complaints can be updated by students.' });
        return;
      }
      // Students cannot change status or resolution_notes
      if (req.body.status || req.body.resolution_notes) {
        res.status(403).json({ error: 'Students cannot change complaint status or resolution notes.' });
        return;
      }
    }

    const updates = req.body;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    const changes: Record<string, { from: any; to: any }> = {};

    const allowedFields = ['title', 'description', 'category', 'priority', 'status', 'resolution_notes'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
        changes[field] = { from: (complaint as any)[field], to: updates[field] };
      }
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No fields to update.' });
      return;
    }

    // Always update the updated_at timestamp
    updateFields.push("updated_at = datetime('now')");

    updateValues.push(complaintId);

    db.prepare(
      `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`
    ).run(...updateValues);

    // Audit trail
    createAuditEntry(complaintId, req.user!.id, 'complaint_updated', JSON.stringify(changes));

    // Notifications for status changes
    if (updates.status && updates.status !== complaint.status) {
      // Notify the complaint owner
      if (complaint.user_id !== req.user!.id) {
        createNotification(
          complaint.user_id,
          complaintId,
          `Your complaint "${complaint.title}" status changed from "${complaint.status}" to "${updates.status}".`,
          updates.status === 'resolved' ? 'success' : 'info'
        );
      }
    }

    const updatedComplaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

    res.json({
      message: 'Complaint updated successfully.',
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ error: 'Failed to update complaint.' });
  }
});

/**
 * POST /api/complaints/:id/comments
 * Add a comment to a complaint.
 * The complaint owner and admins can comment.
 */
router.post('/:id/comments', validate(commentSchema), (req: AuthenticatedRequest, res: Response): void => {
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

    // Authorization: students can comment only on their own complaints; admins on any
    if (req.user!.role === 'student' && complaint.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const { content } = req.body;

    const result = db.prepare(
      `INSERT INTO comments (complaint_id, user_id, content)
       VALUES (?, ?, ?)`
    ).run(complaintId, req.user!.id, content);

    // Update complaint's updated_at timestamp
    db.prepare("UPDATE complaints SET updated_at = datetime('now') WHERE id = ?").run(complaintId);

    // Create audit trail entry
    createAuditEntry(complaintId, req.user!.id, 'comment_added', JSON.stringify({
      comment_id: result.lastInsertRowid,
      content_preview: content.substring(0, 100),
    }));

    // Notify the complaint owner if the commenter is someone else
    if (complaint.user_id !== req.user!.id) {
      createNotification(
        complaint.user_id,
        complaintId,
        `${req.user!.name} commented on your complaint "${complaint.title}".`,
        'info'
      );
    }

    // Notify assigned admin if the commenter is the student
    if (complaint.assigned_to && complaint.assigned_to !== req.user!.id) {
      createNotification(
        complaint.assigned_to,
        complaintId,
        `New comment on complaint #${complaintId} "${complaint.title}" by ${req.user!.name}.`,
        'info'
      );
    }

    const comment = db.prepare(
      `SELECT cm.*, u.name as user_name, u.role as user_role
       FROM comments cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Comment added successfully.',
      comment,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

/**
 * GET /api/complaints/:id/audit
 * Get audit trail for a complaint. Admin only.
 */
router.get('/:id/audit', authorize('admin'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare('SELECT id FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const auditEntries = db.prepare(
      `SELECT at.*, u.name as user_name
       FROM audit_trail at
       LEFT JOIN users u ON at.user_id = u.id
       WHERE at.complaint_id = ?
       ORDER BY at.id ASC`
    ).all(complaintId);

    res.json({ auditTrail: auditEntries });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail.' });
  }
});

/**
 * GET /api/complaints/:id/verify-audit
 * Verify the integrity of the audit trail hash chain for a complaint.
 * Any authenticated user can verify (transparency).
 */
router.get('/:id/verify-audit', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const complaintId = parseInt(req.params.id as string);
    if (isNaN(complaintId)) {
      res.status(400).json({ error: 'Invalid complaint ID.' });
      return;
    }

    const complaint = db.prepare('SELECT id FROM complaints WHERE id = ?').get(complaintId);
    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const result = verifyAuditChain(complaintId);

    res.json({
      complaintId,
      verification: result,
      message: result.valid
        ? `Audit chain is intact (${result.entries} entries verified).`
        : `Audit chain integrity broken at entry ${result.brokenAt} of ${result.entries}.`,
    });
  } catch (error) {
    console.error('Verify audit trail error:', error);
    res.status(500).json({ error: 'Failed to verify audit trail.' });
  }
});

export default router;
