/** User in the system */
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'admin';
  department?: string | null;
  created_at?: string;
}

export interface Officer {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

export type ComplaintCategory =
  | 'academic'
  | 'infrastructure'
  | 'administrative'
  | 'hostel'
  | 'financial'
  | 'other';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'escalated';

/** Grievance complaint with joined user and assignee info */
export interface Complaint {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
  escalated_at: string | null;
  resolution_notes: string | null;
}

export interface Attachment {
  id: number;
  complaint_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface Comment {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name?: string;
  user_role?: 'student' | 'admin';
  content: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  complaint_id: number | null;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: number;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name?: string;
  action: string;
  details: string | null;
  prev_hash: string | null;
  record_hash: string;
  created_at: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  entries: number;
  brokenAt?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedComplaintsResponse {
  complaints: Complaint[];
  pagination: Pagination;
}

export interface PaginatedNotificationsResponse {
  notifications: Notification[];
  pagination: Pagination;
}

export interface ComplaintDetailResponse {
  complaint: Complaint;
  comments: Comment[];
  attachments: Attachment[];
}

export interface DashboardStats {
  totalComplaints: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  avgResolutionTimeHours: number | null;
  recentComplaints: Complaint[];
}

export interface AnalyticsData {
  trendsByMonth: Array<{ month: string; count: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
  resolutionRates: { resolved: number; total: number; rate: number };
  avgTimesByCategory: Array<{ category: string; avgHours: number }>;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

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

export interface AuthorityRequest {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
  reviewer_name?: string | null;
}
