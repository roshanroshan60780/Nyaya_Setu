import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../lib/api';
import type { AnalyticsData } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<AnalyticsData>('/admin/analytics');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load institutional analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Analytics Unavailable</h2>
        <p className="text-sm text-gray-500">{error || 'Could not load analytics data.'}</p>
        <Button variant="primary" onClick={fetchAnalytics}>
          Retry
        </Button>
      </div>
    );
  }

  const maxMonthCount = Math.max(...data.trendsByMonth.map((t) => t.count), 1);
  const maxCategoryCount = Math.max(...data.categoryDistribution.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Institutional Grievance Analytics</h1>
        <p className="text-xs text-gray-500">
          Aggregated and anonymized institutional performance trends, complaint frequency, and resolution benchmarks.
        </p>
      </div>

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start gap-3 text-emerald-950 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-emerald-900">Privacy-Preserving Aggregation Guarantee</h4>
          <p className="mt-0.5 leading-relaxed text-emerald-800">
            In compliance with student data privacy guidelines, this dashboard displays solely aggregated statistical
            metrics. No personally identifiable information (PII) such as student roll numbers, names, phone numbers,
            or specific narrative contents are exposed in these analytics views.
          </p>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Complaints Analyzed</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{data.resolutionRates.total}</p>
            </div>
            <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Resolution Rate</p>
              <p className="text-3xl font-extrabold text-green-700 mt-1">{data.resolutionRates.rate}%</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {data.resolutionRates.resolved} of {data.resolutionRates.total} complaints marked resolved/closed
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Categories</p>
              <p className="text-3xl font-extrabold text-indigo-700 mt-1">{data.categoryDistribution.length}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Institutional grievance domains</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Submission Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Submission Trend Over Time</h3>
                <p className="text-xs text-gray-400">Monthly breakdown of registered grievances</p>
              </div>
              <TrendingUp className="w-4 h-4 text-primary-600" />
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {data.trendsByMonth.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-8">Insufficient longitudinal trend data.</p>
            ) : (
              <div className="space-y-3 pt-2">
                {data.trendsByMonth.map((item) => {
                  const pct = Math.round((item.count / maxMonthCount) * 100);
                  return (
                    <div key={item.month} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="font-mono text-gray-700">{item.month}</span>
                        <span className="text-primary-700 font-bold">{item.count} grievances</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Distribution by Grievance Domain</h3>
                <p className="text-xs text-gray-400">Proportion of grievances by institutional category</p>
              </div>
              <PieChart className="w-4 h-4 text-primary-600" />
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {data.categoryDistribution.map((item) => {
              const pct = Math.round((item.count / maxCategoryCount) * 100);
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-gray-800">{item.category}</span>
                    <span className="text-gray-500 font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* Average Resolution Time by Domain */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Average Resolution Time by Category</h3>
              <p className="text-xs text-gray-400">Mean duration from grievance filing to official resolution</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Avg Duration (Hours)</th>
                  <th className="py-3 px-4">Equivalent Days</th>
                  <th className="py-3 px-4 text-right">Service Level Benchmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.avgTimesByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                      No resolved complaints available yet to calculate average times.
                    </td>
                  </tr>
                ) : (
                  data.avgTimesByCategory.map((row) => {
                    const days = (row.avgHours / 24).toFixed(1);
                    const isFast = row.avgHours < 72;
                    return (
                      <tr key={row.category} className="hover:bg-gray-50">
                        <td className="py-3 px-4 capitalize font-semibold text-gray-900">{row.category}</td>
                        <td className="py-3 px-4 font-mono font-medium text-gray-800">{row.avgHours} hrs</td>
                        <td className="py-3 px-4 text-gray-600">{days} days</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFast ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isFast ? 'Optimal (<3 Days)' : 'Attention (>3 Days)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
