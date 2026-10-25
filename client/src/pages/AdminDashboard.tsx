import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import api from '../lib/api';
import type { DashboardStats, Complaint } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingEscalation, setCheckingEscalation] = useState(false);
  const [escalationNotice, setEscalationNotice] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardStats>('/admin/dashboard');
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunEscalationScan = async () => {
    setCheckingEscalation(true);
    setEscalationNotice('');
    try {
      const res = await api.post<{ message: string; escalatedCount: number }>('/admin/check-escalations');
      setEscalationNotice(res.data.message);
      await fetchStats();
    } catch (err: any) {
      setEscalationNotice(err.response?.data?.error || 'Escalation scan failed.');
    } finally {
      setCheckingEscalation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Dashboard Unavailable</h2>
        <p className="text-sm text-gray-500">{error || 'Could not load administrative data.'}</p>
        <Button variant="primary" onClick={fetchStats}>
          Retry
        </Button>
      </div>
    );
  }

  const openCount = (stats.byStatus['open'] || 0) + (stats.byStatus['in_progress'] || 0);
  const resolvedCount = (stats.byStatus['resolved'] || 0) + (stats.byStatus['closed'] || 0);
  const escalatedCount = stats.byStatus['escalated'] || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrator Oversight Dashboard</h1>
          <p className="text-xs text-gray-500">
            Institutional grievance monitoring, triage management, and automated escalation controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunEscalationScan}
            loading={checkingEscalation}
            className="!border-red-200 !text-red-700 hover:!bg-red-50"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5 text-red-600" />
            Check Overdue (7+ Days)
          </Button>
          <Link to="/admin/complaints">
            <Button variant="primary" size="sm">
              <FileText className="w-4 h-4 mr-1.5" />
              Manage All Complaints
            </Button>
          </Link>
        </div>
      </div>

      {/* Escalation Notification Banner */}
      {escalationNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{escalationNotice}</span>
          </div>
          <button onClick={() => setEscalationNotice('')} className="text-amber-600 font-bold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-l-4 border-l-primary-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Complaints</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalComplaints}</p>
          <p className="text-[10px] text-gray-400 mt-1">Across all categories</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-yellow-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Triage / Action</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{openCount}</p>
          <p className="text-[10px] text-yellow-600 mt-1">{stats.byStatus['open'] || 0} open, {stats.byStatus['in_progress'] || 0} active</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{resolvedCount}</p>
          <p className="text-[10px] text-green-600 mt-1">{stats.byStatus['resolved'] || 0} verified</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Escalated</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{escalatedCount}</p>
          <p className="text-[10px] text-red-600 mt-1">Requires immediate attention</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500 col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Resolution</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {stats.avgResolutionTimeHours !== null ? `${stats.avgResolutionTimeHours}h` : 'N/A'}
          </p>
          <p className="text-[10px] text-indigo-600 mt-1">From filing to closure</p>
        </Card>
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-900">Grievances by Category</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {Object.entries(stats.byCategory).map(([cat, count]) => {
              const pct = stats.totalComplaints > 0 ? Math.round((count / stats.totalComplaints) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-gray-700">{cat}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-gray-900">Priority Severity Distribution</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {Object.entries(stats.byPriority).map(([prio, count]) => {
              const pct = stats.totalComplaints > 0 ? Math.round((count / stats.totalComplaints) * 100) : 0;
              const colorMap: Record<string, string> = {
                critical: 'bg-red-500',
                high: 'bg-orange-500',
                medium: 'bg-blue-500',
                low: 'bg-gray-400',
              };
              return (
                <div key={prio} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-gray-700">{prio}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${colorMap[prio] || 'bg-primary-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* Recent Submissions Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Recent Grievances</h3>
            <p className="text-xs text-gray-400">Latest 10 complaints logged into the institutional registry</p>
          </div>
          <Link
            to="/admin/complaints"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center"
          >
            View All ({stats.totalComplaints}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </CardHeader>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Filed</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentComplaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/complaints/${c.id}`)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-semibold text-gray-900 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                      {c.user_name || `User #${c.user_id}`}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <Badge variant="category" value={c.category}>
                        {c.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <Badge variant="priority" value={c.priority}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <Badge variant="status" value={c.status}>
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span className="text-primary-600 font-semibold hover:underline">
                        Review
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
