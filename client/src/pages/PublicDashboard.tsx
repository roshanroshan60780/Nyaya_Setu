import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  UserCheck,
  TrendingUp,
  Lock,
  ExternalLink,
  ChevronRight,
  Info,
  LogOut,
  LayoutDashboard,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import type { PublicStats } from '../types';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

export default function PublicDashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await api.get<PublicStats>('/public/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to load public stats:', err);
      setError(
        err.response?.data?.error ||
        'Unable to retrieve real-time grievance statistics. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleComplaintCTA = () => {
    if (!isAuthenticated) {
      navigate('/login/student');
    } else if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/complaints/new');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans">
      {/* ─── Top Header Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Project Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-saffron-500 via-white to-accent-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Scale className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-saffron-600">Nyaya</span>
                  <span className="text-primary-600">Setu</span>
                </span>
                <span className="text-[11px] font-semibold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full border border-primary-200 hidden sm:inline-block">
                  Public Portal
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">College Grievance Redressal System</p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('statistics')}
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Public Statistics
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('transparency')}
              className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Transparency
            </button>
          </nav>

          {/* Right Action / Auth Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                  className="flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-primary-600" />
                  <span>{user.role === 'admin' ? 'Admin Dashboard' : 'Student Dashboard'}</span>
                </Button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link to="/login">
                  <Button variant="secondary" size="sm" className="font-semibold">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="font-semibold shadow-sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-slate-50 pt-16 pb-20 lg:pt-24 lg:pb-28 border-b border-gray-200">
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-saffron-200/40 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100/80 border border-primary-200 text-primary-800 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary-600" />
            <span>Open, Accountable & Cryptographically Audited Grievance Redressal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Your Voice Matters.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-700 to-saffron-600">
              Every Complaint Counts.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            NyayaSetu connects citizens and students with the authorities responsible for resolving their grievances through a transparent, accountable, and trackable process.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleComplaintCTA}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-md flex items-center justify-center gap-2 group"
            >
              <span>Submit a Complaint</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('statistics')}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
            >
              Explore Public Statistics
            </Button>
          </div>

          {/* Quick Pillars */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">7-Day Escalation</h4>
              <p className="text-xs text-gray-500 mt-0.5">Automated SLA alerts for overdue grievances</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Tracked Redressal</h4>
              <p className="text-xs text-gray-500 mt-0.5">Real-time status updates from submission to fix</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Cryptographic Trail</h4>
              <p className="text-xs text-gray-500 mt-0.5">SHA-256 hash chains detect log alteration</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/80 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Privacy Preserved</h4>
              <p className="text-xs text-gray-500 mt-0.5">Public statistics strictly exclude student PII</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Public Statistics Dashboard ─────────────────────────────────────────── */}
      <section id="statistics" className="py-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header with Refresh */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>Live Grievance Transparency</span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Institutional Redressal Statistics
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                Aggregated in real time directly from database records. No personal identification data, complaint bodies, or attachments are published.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {stats?.lastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated: {new Date(stats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchStats(true)}
                disabled={loading || refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Stats'}</span>
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
              <Spinner size="lg" />
              <p className="text-sm text-gray-500 font-medium mt-4">Querying database aggregation...</p>
            </div>
          )}

          {/* Error State with Retry */}
          {!loading && error && (
            <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center max-w-xl mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-900">Statistics Unavailable</h3>
              <p className="text-sm text-red-700 mt-1 mb-6">{error}</p>
              <Button onClick={() => fetchStats(false)} variant="danger" size="sm">
                Retry Connection
              </Button>
            </div>
          )}

          {/* Loaded Statistics Cards */}
          {!loading && !error && stats && (
            <>
              {/* Formula & Definitions Alert Banner */}
              <div className="mb-8 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs sm:text-sm text-blue-900">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong className="font-semibold">Pending Definition:</strong>{' '}
                    {stats.pendingDefinition}
                  </p>
                  <p>
                    <strong className="font-semibold">Resolution Formula:</strong>{' '}
                    <code className="bg-white/80 px-2 py-0.5 rounded border border-blue-200 text-blue-950 font-mono text-xs">
                      {stats.resolutionFormula}
                    </code>
                  </p>
                </div>
              </div>

              {/* Primary Stat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between text-gray-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Filed</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-gray-950">{stats.totalComplaints}</div>
                  <p className="text-xs text-gray-500 mt-2">Cumulative complaints registered</p>
                </div>

                {/* Pending */}
                <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/30">
                  <div className="flex items-center justify-between text-blue-700 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Pending (Open)</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-blue-900">{stats.pendingComplaints}</div>
                  <p className="text-xs text-blue-600/80 mt-2">Awaiting officer assignment</p>
                </div>

                {/* In Progress */}
                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/30">
                  <div className="flex items-center justify-between text-amber-700 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-900">{stats.inProgressComplaints}</div>
                  <p className="text-xs text-amber-600/80 mt-2">Assigned & actively redressed</p>
                </div>

                {/* Resolution Rate */}
                <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
                  <div className="flex items-center justify-between text-emerald-700 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Resolution Rate</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-950">
                    {stats.resolutionRate}%
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-3">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, stats.resolutionRate))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Stat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {/* Resolved */}
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved</span>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolvedComplaints}</div>
                    <span className="text-xs text-gray-400">Solution accepted</span>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>

                {/* Closed */}
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Closed</span>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{stats.closedComplaints}</div>
                    <span className="text-xs text-gray-400">Archived with audit trail</span>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-gray-400" />
                </div>

                {/* Escalated */}
                <div className="p-5 rounded-xl border border-red-200 bg-red-50/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Escalated</span>
                    <div className="text-2xl font-bold text-red-700 mt-1">{stats.escalatedComplaints}</div>
                    <span className="text-xs text-red-500">Overdue SLA triggers</span>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              {/* Category Breakdown Badges */}
              {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
                <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    Distribution by Grievance Domain
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.byCategory).map(([cat, count]) => (
                      <div
                        key={cat}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-2"
                      >
                        <span className="text-xs font-medium text-gray-700 capitalize">{cat}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─── How NyayaSetu Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-saffron-600">
              Clear & Accountable Workflow
            </span>
            <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight mt-1">
              How Grievances Move from Submission to Resolution
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Every stage of your grievance is monitored, assigned to verified college authorities, and sealed with tamper-evident audit logs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 font-black text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Submit Grievance</h3>
              <p className="text-xs text-gray-600 leading-relaxed flex-1">
                A registered student logs into the student portal, fills the grievance form with category and priority, and attaches optional documentation.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-primary-600 font-semibold flex items-center gap-1">
                <span>Genesis hash logged</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Review & Assignment</h3>
              <p className="text-xs text-gray-600 leading-relaxed flex-1">
                College administration assesses the complaint and assigns it to the designated department officer (Hostel, Academics, Infrastructure, etc.).
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                <span>Status: In Progress</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Action & Resolution</h3>
              <p className="text-xs text-gray-600 leading-relaxed flex-1">
                The assigned authority investigates, posts transparent progress notes in the discussion thread, and marks the grievance as resolved.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>Resolution notes recorded</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 font-black text-lg flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Verification & Closure</h3>
              <p className="text-xs text-gray-600 leading-relaxed flex-1">
                Students review the resolution. If unresolved after 7 days of inactivity, the engine auto-escalates to senior college administration.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                <span>Hash chain verifiable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Transparency & Accountability ──────────────────────────────────────── */}
      <section id="transparency" className="py-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                Institutional Integrity
              </span>
              <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight mt-1 mb-6">
                Engineered for Complete Trust and Traceability
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Unlike informal email complaints or paper drop boxes that can be misplaced or silently ignored, NyayaSetu guarantees every complaint is timestamped, audited, and tracked through open metrics.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Cryptographic SHA-256 Audit Chain</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Every status change and assignment calculates a sequential cryptographic hash. Tampering with intermediate logs breaks the chain immediately.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Automated SLA Escalation Rules</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Complaints with more than 7 days of inactivity are automatically escalated to senior leadership with urgent notifications.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Verified Authority Roles</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Privileged officer accounts cannot be created by arbitrary visitors. New authority accounts require official verification and administrator approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <Scale className="w-7 h-7 text-saffron-400" />
                  <div>
                    <h3 className="text-lg font-bold">NyayaSetu Principles</h3>
                    <p className="text-xs text-gray-400">Institutional Redressal Charter</p>
                  </div>
                </div>

                <blockquote className="text-sm text-gray-300 italic leading-relaxed border-l-2 border-saffron-500 pl-4 mb-6">
                  "Justice is rooted in accountability. By providing students with guaranteed escalation and verifiable tracking, we rebuild institutional trust."
                </blockquote>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xl font-bold text-white">0%</div>
                    <div className="text-xs text-gray-400">Silently Ignored</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-saffron-300">100%</div>
                    <div className="text-xs text-gray-400">Audited Changes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Role Selection Call to Action ──────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">
            Ready to Access NyayaSetu?
          </h2>
          <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
            Choose your designated portal to log in, register a student account, or request authority credentials.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
            {/* Student Card */}
            <div className="bg-white p-8 rounded-2xl border-2 border-primary-200 hover:border-primary-500 hover:shadow-lg transition-all flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Student Portal</h3>
              <p className="text-xs text-gray-500 mt-1 mb-6 flex-1">
                Register with your university email or log in to submit grievances, upload evidence, and track status.
              </p>
              <div className="flex items-center gap-3">
                <Link to="/login/student" className="flex-1">
                  <Button variant="primary" size="md" className="w-full font-semibold">
                    Student Login
                  </Button>
                </Link>
                <Link to="/register/student" className="flex-1">
                  <Button variant="secondary" size="md" className="w-full font-semibold">
                    Register
                  </Button>
                </Link>
              </div>
            </div>

            {/* Authority Card */}
            <div className="bg-white p-8 rounded-2xl border-2 border-saffron-200 hover:border-saffron-500 hover:shadow-lg transition-all flex flex-col group">
              <div className="w-12 h-12 rounded-xl bg-saffron-50 text-saffron-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Authority Portal</h3>
              <p className="text-xs text-gray-500 mt-1 mb-6 flex-1">
                Administrative officers and faculty coordinators manage assigned grievances and review requests.
              </p>
              <div className="flex items-center gap-3">
                <Link to="/login/authority" className="flex-1">
                  <Button variant="primary" size="md" className="w-full font-semibold bg-saffron-600 hover:bg-saffron-700 focus:ring-saffron-500">
                    Authority Login
                  </Button>
                </Link>
                <Link to="/register/authority" className="flex-1">
                  <Button variant="secondary" size="md" className="w-full font-semibold">
                    Request Access
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-500 via-white to-accent-600 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary-700" />
                </div>
                <span className="text-lg font-bold text-white">
                  <span className="text-saffron-400">Nyaya</span>Setu
                </span>
              </div>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                A college grievance redressal portal built for transparent resolution, cryptographic tamper detection, and active escalation management.
              </p>
              <p className="text-[11px] text-gray-500 mt-3">
                Developed for E3 Code Sangam 2026 Hackathon • Team Web_Shooter
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Portals</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login/student" className="hover:text-white transition-colors">Student Login</Link></li>
                <li><Link to="/register/student" className="hover:text-white transition-colors">Student Registration</Link></li>
                <li><Link to="/login/authority" className="hover:text-white transition-colors">Authority Login</Link></li>
                <li><Link to="/register/authority" className="hover:text-white transition-colors">Authority Access Request</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Platform</h5>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => scrollToSection('statistics')} className="hover:text-white transition-colors">Public Statistics</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('transparency')} className="hover:text-white transition-colors">Audit Hash Chains</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <p>© {new Date().getFullYear()} NyayaSetu. Transparent College Grievance Redressal System.</p>
            <p>Protected by SHA-256 Audit Chains & Automated Escalation Engines</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
