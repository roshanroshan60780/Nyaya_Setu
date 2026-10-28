import { Request } from 'express';

/** Represents a user in the system */
export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: 'student' | 'admin';
  department: string | null;
  is_verified: number;
  created_at: string;
}

/** User data safe to return in API responses (no password hash) */
export type SafeUser = Omit<User, 'password_hash'>;

/** Complaint categories */
export type ComplaintCategory = 'academic' | 'infrastructure' | 'administrative' | 'hostel' | 'financial' | 'other';

/** Complaint priority levels */
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

/** Complaint status values */
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';

/** Represents a grievance complaint */
export interface Complaint {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  resolution_notes: string | null;
}

/** Represents a comment on a complaint */
export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

/** Represents a file attachment on a complaint */
export interface Attachment {
  id: number;
  complaint_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

/** Represents a user notification */
export interface Notification {
  id: number;
  user_id: number;
  complaint_id: number | null;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: number;
  created_at: string;
}

/** Represents an entry in the audit trail with hash chain integrity */
export interface AuditEntry {
  id: number;
  complaint_id: number;
  user_id: number;
  action: string;
  details: string | null;
  prev_hash: string | null;
  record_hash: string;
  created_at: string;
}

/** JWT payload structure */
export interface JwtPayload {
  userId: number;
  email: string;
  role: 'student' | 'admin';
}

/** Extended Express Request with authenticated user data */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: 'student' | 'admin';
    department: string | null;
  };
}

/** Pagination query parameters */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Complaint filter query parameters */
export interface ComplaintFilterQuery extends PaginationQuery {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
  search?: string;
}

/** Dashboard statistics */
export interface DashboardStats {
  totalComplaints: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  avgResolutionTimeHours: number | null;
  recentComplaints: Complaint[];
}

/** Analytics data (anonymized, no PII) */
export interface AnalyticsData {
  trendsByMonth: Array<{ month: string; count: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
  resolutionRates: { resolved: number; total: number; rate: number };
  avgTimesByCategory: Array<{ category: string; avgHours: number }>;
}

/** Audit chain verification result */
export interface AuditVerificationResult {
  valid: boolean;
  entries: number;
  brokenAt?: number;
}

/** Public aggregate statistics (strictly non-PII) */
export interface PublicStats {
  totalComplaints: number;
  pendingComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  closedComplaints: number;
  escalatedComplaints: number;
  resolutionRate: number;
  byCategory: Record<string, number>;
  pendingDefinition: string;
  resolutionFormula: string;
  lastUpdated: string;
}

/** Authority registration request */
export interface AuthorityRequest {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_verified: number;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

/** Email OTP verification challenge */
export interface EmailVerification {
  id: number;
  email: string;
  otp_hash: string;
  verification_type: 'student_registration' | 'authority_request';
  payload: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  created_at: string;
}
