import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  UserCheck,
  UserPlus,
  CheckCircle,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
  Check,
} from 'lucide-react';
import api from '../lib/api';
import type { Complaint, PaginatedComplaintsResponse, Officer } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'escalated', label: 'Escalated' },
];

export default function AdminComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real officers fetched from backend
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Modals state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignedAdminId, setAssignedAdminId] = useState('1');
  const [assignLoading, setAssignLoading] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchOfficers = async () => {
    setLoadingOfficers(true);
    try {
      const res = await api.get<{ officers: Officer[] }>('/admin/officers');
      setOfficers(res.data.officers || []);
      if (res.data.officers?.length > 0 && !assignedAdminId) {
        setAssignedAdminId(res.data.officers[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to load eligible officers from backend:', err);
    } finally {
      setLoadingOfficers(false);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await api.get<PaginatedComplaintsResponse>(`/complaints?${params.toString()}`);
      setComplaints(res.data.complaints);
      setTotalPages(res.data.pagination.totalPages || 1);
      setTotalItems(res.data.pagination.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, categoryFilter, priorityFilter, search, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const openAssignModal = (e: React.MouseEvent, complaint: Complaint) => {
    e.stopPropagation();
    setSelectedComplaint(complaint);
    const defaultId = complaint.assigned_to
      ? complaint.assigned_to.toString()
      : officers.length > 0
      ? officers[0].id.toString()
      : '1';
    setAssignedAdminId(defaultId);
    setActionError('');
    setAssignModalOpen(true);
    if (officers.length === 0) {
      fetchOfficers();
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedComplaint) return;
    setAssignLoading(true);
    setActionError('');
    try {
      const targetOfficerId = parseInt(assignedAdminId, 10);
      await api.put(`/admin/complaints/${selectedComplaint.id}/assign`, {
        assigned_to: targetOfficerId,
      });

      const assignedOfficer = officers.find((o) => o.id === targetOfficerId);
      setSuccessNotice(
        `Grievance #${selectedComplaint.id} was successfully assigned to ${
          assignedOfficer ? `${assignedOfficer.name} (${assignedOfficer.department || 'Administration'})` : 'the designated officer'
        }.`
      );

      setAssignModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to assign complaint.');
    } finally {
      setAssignLoading(false);
    }
  };

  const openStatusModal = (e: React.MouseEvent, complaint: Complaint) => {
    e.stopPropagation();
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setResolutionNotes(complaint.resolution_notes || '');
    setActionError('');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedComplaint) return;
    setStatusLoading(true);
    setActionError('');
    try {
      await api.put(`/admin/complaints/${selectedComplaint.id}/status`, {
        status: newStatus,
        resolution_notes: resolutionNotes || undefined,
      });
      setSuccessNotice(`Grievance #${selectedComplaint.id} status successfully updated to "${newStatus}".`);
      setStatusModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints Management Registry</h1>
          <p className="text-xs text-gray-500">
            Triage, assign department coordinators, update statuses, and enforce institutional accountability.
          </p>
        </div>
        <div className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
          Total Grievances: <span className="font-bold text-gray-900">{totalItems}</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative lg:col-span-2">
              <input
                type="text"
                placeholder="Search subject or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </form>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              <option value="academic">Academic</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="hostel">Hostel & Mess</option>
              <option value="administrative">Administrative</option>
              <option value="financial">Financial</option>
              <option value="other">Other</option>
            </select>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 space-y-2">
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={fetchComplaints}>
                Retry
              </Button>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No grievances found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {complaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-gray-400">#{c.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 max-w-xs truncate">{c.title}</div>
                        <div className="text-[11px] text-gray-400 max-w-xs truncate">{c.description}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        <div className="font-medium">{c.user_name || `User #${c.user_id}`}</div>
                        <div className="text-[10px] text-gray-400">{c.user_email}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="category" value={c.category}>
                          {c.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="priority" value={c.priority}>
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="status" value={c.status}>
                          {c.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      {/* Clearly Visible Assigned Officer Column with Action */}
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {c.assigned_to_name ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{c.assigned_to_name}</span>
                            <button
                              onClick={(e) => openAssignModal(e, c)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                              title="Reassign to another officer"
                            >
                              Reassign
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => openAssignModal(e, c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 shadow-sm transition-all"
                            title="Click to assign an administrative officer"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-primary-600" />
                            Assign Officer
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      {/* Clearly Labeled Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => openAssignModal(e, c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors shadow-sm"
                            title="Assign or reassign officer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                            <span>{c.assigned_to ? 'Reassign' : 'Assign Officer'}</span>
                          </button>
                          <button
                            onClick={(e) => openStatusModal(e, c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                            title="Update status"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-gray-500" />
                            <span>Status</span>
                          </button>
                          <button
                            onClick={() => navigate(`/complaints/${c.id}`)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            title="View details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Assign Modal with Dynamic Officers from Backend */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Officer to Grievance #${selectedComplaint?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Select an administrative officer to take responsibility for{' '}
            <strong>"{selectedComplaint?.title}"</strong>. An append-only cryptographic audit record will be logged
            and an immediate notification sent to the student and officer.
          </p>

          {actionError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}

          {loadingOfficers ? (
            <div className="py-6 flex flex-col justify-center items-center gap-2">
              <Spinner size="md" />
              <span className="text-xs text-gray-500">Loading eligible officers from server...</span>
            </div>
          ) : officers.length === 0 ? (
            <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              No administrator accounts found. Please ensure seed users are configured.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Eligible Administrative Officer *
              </label>
              <select
                value={assignedAdminId}
                onChange={(e) => setAssignedAdminId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-gray-900"
              >
                {officers.map((off) => (
                  <option key={off.id} value={off.id.toString()}>
                    {off.name} — {off.department || 'Administration'} ({off.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Fetched live from database ({officers.length} active administrators available).
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="ghost" size="sm" onClick={() => setAssignModalOpen(false)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignSubmit}
              loading={assignLoading}
              disabled={loadingOfficers || officers.length === 0}
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Update Status: Grievance #${selectedComplaint?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Transition the workflow state for <strong>"{selectedComplaint?.title}"</strong>.
          </p>

          {actionError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}

          <Select
            label="Grievance Status"
            options={STATUS_OPTIONS}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />

          <TextArea
            label="Resolution / Status Notes"
            rows={4}
            placeholder="Document actions taken, findings, department responses, or reason for status transition..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            helperText="Visible to the student and recorded in the audit trail."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStatusModalOpen(false)} disabled={statusLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleStatusSubmit} loading={statusLoading}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
