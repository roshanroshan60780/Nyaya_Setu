import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  UserCheck,
  CheckCircle,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import type { Complaint, PaginatedComplaintsResponse } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';

const ADMIN_OFFICERS = [
  { value: '1', label: 'Dr. Rajesh Verma (Administration)' },
  { value: '2', label: 'Prof. Sunita Sharma (Student Affairs)' },
];

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
    setAssignedAdminId(complaint.assigned_to ? complaint.assigned_to.toString() : '1');
    setActionError('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedComplaint) return;
    setAssignLoading(true);
    setActionError('');
    try {
      await api.put(`/admin/complaints/${selectedComplaint.id}/assign`, {
        assigned_to: parseInt(assignedAdminId, 10),
      });
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
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {c.assigned_to_name ? (
                          <span className="font-medium text-gray-900">{c.assigned_to_name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Assign Officer"
                            onClick={(e) => openAssignModal(e, c)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Update Status"
                            onClick={(e) => openStatusModal(e, c)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Open Detail"
                            onClick={() => navigate(`/complaints/${c.id}`)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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

      {/* Assign Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Officer to Grievance #${selectedComplaint?.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Select an administrative officer to handle <strong>"{selectedComplaint?.title}"</strong>. An audit log
            entry and student notification will be created.
          </p>

          {actionError && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}

          <Select
            label="Assigned Officer"
            options={ADMIN_OFFICERS}
            value={assignedAdminId}
            onChange={(e) => setAssignedAdminId(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setAssignModalOpen(false)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssignSubmit} loading={assignLoading}>
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
