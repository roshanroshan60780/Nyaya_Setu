import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import type { Complaint, PaginatedComplaintsResponse } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '50');

      const response = await api.get<PaginatedComplaintsResponse>(`/complaints?${params.toString()}`);
      setComplaints(response.data.complaints);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  // Compute stat counts from fetched list or all
  const totalCount = complaints.length;
  const openCount = complaints.filter((c) => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const escalatedCount = complaints.filter((c) => c.status === 'escalated').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 bg-gradient-to-l from-saffron-400 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-primary-100 mb-3 backdrop-blur-sm">
              <span>NyayaSetu Student Portal</span>
              {user?.department && <span>• {user.department}</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.name}</h1>
            <p className="text-primary-100 mt-1 max-w-xl text-sm leading-relaxed">
              Track status updates, follow up with faculty coordinators, and submit institutional grievances transparently.
            </p>
          </div>
          <Link to="/complaints/new" className="self-start md:self-auto">
            <Button variant="secondary" className="!bg-white !text-primary-800 hover:!bg-primary-50 font-semibold shadow">
              <PlusCircle className="w-4 h-4 mr-2 text-primary-600" />
              File Grievance
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Filed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Under Action</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">{openCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{resolvedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Escalated</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{escalatedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Grievance List Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Your Grievances</h2>
            <p className="text-xs text-gray-500">View real-time status and audit records of your complaints</p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={fetchComplaints} className="mt-3">
                Retry
              </Button>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No grievances found"
                description={
                  searchTerm || statusFilter
                    ? 'No complaints match your current filter.'
                    : "You haven't submitted any grievances yet."
                }
                action={
                  <Link to="/complaints/new">
                    <Button variant="primary" size="sm">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Submit your first grievance
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Grievance</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {complaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/complaints/${c.id}`)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 line-clamp-1">{c.title}</div>
                        <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{c.description}</div>
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
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {c.assigned_to_name ? (
                          <span className="font-medium text-gray-800">{c.assigned_to_name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-xs text-primary-600 font-medium inline-flex items-center hover:underline">
                          View Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
