import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  ShieldAlert,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import type {
  Complaint,
  Comment,
  Attachment,
  AuditEntry,
  AuditVerificationResult,
  ComplaintDetailResponse,
} from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextArea from '../components/ui/TextArea';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Audit verification
  const [verifyingAudit, setVerifyingAudit] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [auditMessage, setAuditMessage] = useState('');

  const fetchComplaintDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ComplaintDetailResponse>(`/complaints/${id}`);
      setComplaint(res.data.complaint);
      setComments(res.data.comments || []);
      setAttachments(res.data.attachments || []);

      // If user is admin, also fetch audit trail
      if (user?.role === 'admin') {
        try {
          const auditRes = await api.get<{ auditTrail: AuditEntry[] }>(`/complaints/${id}/audit`);
          setAuditTrail(auditRes.data.auditTrail || []);
        } catch {
          // Non-critical if audit fetch fails
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load grievance details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchComplaintDetails();
    }
  }, [id, user?.role]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    setCommentError('');
    try {
      const res = await api.post<{ comment: Comment }>(`/complaints/${id}/comments`, {
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
      // Refresh audit trail for admins
      if (user?.role === 'admin') {
        const auditRes = await api.get<{ auditTrail: AuditEntry[] }>(`/complaints/${id}/audit`);
        setAuditTrail(auditRes.data.auditTrail || []);
      }
    } catch (err: any) {
      setCommentError(err.response?.data?.error || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVerifyAudit = async () => {
    setVerifyingAudit(true);
    setVerificationResult(null);
    try {
      const res = await api.get<{ verification: AuditVerificationResult; message: string }>(
        `/complaints/${id}/verify-audit`
      );
      setVerificationResult(res.data.verification);
      setAuditMessage(res.data.message);
    } catch (err: any) {
      setAuditMessage('Verification request failed.');
    } finally {
      setVerifyingAudit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Unable to View Grievance</h2>
        <p className="text-sm text-gray-500">{error || 'Grievance not found or access denied.'}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back and Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">ID #{complaint.id}</span>
          <Badge variant="status" value={complaint.status}>
            {complaint.status.replace('_', ' ')}
          </Badge>
          <Badge variant="priority" value={complaint.priority}>
            {complaint.priority}
          </Badge>
        </div>
      </div>

      {/* Escalation Warning Banner */}
      {complaint.status === 'escalated' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h4 className="font-bold text-sm">Grievance Escalated to Senior Administration</h4>
            <p className="text-xs text-red-700 mt-0.5">
              This grievance has been flagged for prioritized administrative intervention
              {complaint.escalated_at ? ` on ${new Date(complaint.escalated_at).toLocaleString()}` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Main Grievance Details Card */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="category" value={complaint.category}>
              {complaint.category}
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Filed on{' '}
              {new Date(complaint.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{complaint.title}</h1>

          {/* Submitter & Assignee pill row */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-gray-600 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar name={complaint.user_name || 'Student'} size="sm" />
              <div>
                <span className="text-gray-400 block text-[10px]">Submitted By</span>
                <span className="font-semibold text-gray-900">{complaint.user_name || 'Student'}</span>
                {complaint.user_email && <span className="text-gray-400 ml-1">({complaint.user_email})</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                {complaint.assigned_to_name ? complaint.assigned_to_name.charAt(0) : '?'}
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Assigned Officer</span>
                <span className="font-semibold text-gray-900">
                  {complaint.assigned_to_name || 'Unassigned (In Triage)'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              {complaint.description}
            </p>
          </div>

          {/* Resolution Notes (if available) */}
          {complaint.resolution_notes && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Official Resolution Notes
              </div>
              <p className="text-xs text-green-800 whitespace-pre-line pl-6">
                {complaint.resolution_notes}
              </p>
            </div>
          )}

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Attachments ({attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/uploads/${att.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/70 hover:bg-white hover:shadow-sm hover:border-primary-300 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-primary-600 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{att.original_name}</span>
                      <span className="text-gray-400 text-[10px]">({(att.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Download className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Cryptographic Hash Chain Audit Section */}
      <Card className="border border-blue-100 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-700">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Tamper-Evident Audit Verification</h2>
              <p className="text-xs text-gray-500">
                Cryptographic SHA-256 hash chain verification of chronological records
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleVerifyAudit}
            loading={verifyingAudit}
            className="!text-primary-700 !border-primary-200"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-primary-600" />
            Verify Hash Chain
          </Button>
        </CardHeader>

        <CardBody className="space-y-4">
          {/* Verification Status Result */}
          {verificationResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                verificationResult.valid
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {verificationResult.valid ? (
                <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-bold text-sm">
                  {verificationResult.valid ? 'Cryptographic Integrity Verified' : 'Integrity Mismatch Detected'}
                </h4>
                <p>{auditMessage}</p>
                <p className="text-[11px] opacity-80">
                  {verificationResult.valid
                    ? `All ${verificationResult.entries} consecutive audit links match SHA-256 hashes anchored to GENESIS.`
                    : `Chain failure detected at index ${verificationResult.brokenAt}. Possible record modification.`}
                </p>
              </div>
            </div>
          )}

          {/* Audit Trail Table for Admin */}
          {user?.role === 'admin' && auditTrail.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Full Audit Trail ({auditTrail.length} entries)
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Details</th>
                      <th className="py-2.5 px-3 font-mono">Record Hash</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditTrail.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-gray-50/70 font-mono text-[11px]">
                        <td className="py-2 px-3 text-gray-400 font-sans">{index + 1}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-gray-800">
                          {entry.action.replace('_', ' ')}
                        </td>
                        <td className="py-2 px-3 font-sans text-gray-600">{entry.user_name || 'System'}</td>
                        <td className="py-2 px-3 font-sans text-gray-600 max-w-xs truncate" title={entry.details || ''}>
                          {entry.details || '—'}
                        </td>
                        <td className="py-2 px-3 text-primary-600" title={entry.record_hash}>
                          {entry.record_hash.substring(0, 10)}...
                        </td>
                        <td className="py-2 px-3 text-gray-400 font-sans whitespace-nowrap">
                          {entry.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Limitation Disclaimer (as explicitly required by prompt) */}
          <div className="text-[11px] text-gray-400 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <strong>Security Notice & Limitations:</strong> The hash chain guarantees tamper-evidence by linking
            sequential log entries using SHA-256. While it detects unauthorized inline edits or deletions, it does not
            provide absolute security against an attacker with full underlying database root write privileges who could
            recompute the chain. Independent external timestamp anchoring is recommended for high-assurance legal evidence.
          </div>
        </CardBody>
      </Card>

      {/* Discussion / Comments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h2 className="text-base font-bold text-gray-900">Communication & Updates ({comments.length})</h2>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Comments list */}
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-4">
              No comments yet. Post an update or ask a question below.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((cm) => {
                const isAdmin = cm.user_role === 'admin';
                return (
                  <div
                    key={cm.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      isAdmin
                        ? 'bg-primary-50/40 border-primary-100 ml-0 sm:ml-6'
                        : 'bg-gray-50/70 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={cm.user_name || 'User'} size="sm" />
                        <div>
                          <span className="font-semibold text-gray-900">{cm.user_name}</span>
                          <span
                            className={`ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isAdmin ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {cm.user_role}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(cm.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-line leading-relaxed pl-8">{cm.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add comment box */}
          <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t border-gray-100">
            <TextArea
              rows={3}
              placeholder="Write a message, request an update, or add clarifying information..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              error={commentError}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submittingComment}
                disabled={!commentText.trim()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Post Comment
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
