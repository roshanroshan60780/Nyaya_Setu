import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import api from '../lib/api';
import type { Notification, PaginatedNotificationsResponse } from '../types';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (unreadOnly) params.append('unread', 'true');

      const res = await api.get<PaginatedNotificationsResponse>(`/notifications?${params.toString()}`);
      setNotifications(res.data.notifications);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, unreadOnly]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // Ignore error
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await api.put(`/notifications/${notif.id}/read`);
      } catch {
        // Silently proceed
      }
    }
    if (notif.complaint_id) {
      navigate(`/complaints/${notif.complaint_id}`);
    }
  };

  const renderIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-primary-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
          <p className="text-xs text-gray-500">
            Real-time alerts regarding grievance status changes, administrative assignments, and comments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setUnreadOnly(!unreadOnly);
              setPage(1);
            }}
            className={unreadOnly ? '!bg-primary-50 !text-primary-700 !border-primary-300' : ''}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            loading={markingAll}
            disabled={unreadCount === 0 && !unreadOnly}
          >
            <CheckCheck className="w-4 h-4 mr-1.5 text-primary-600" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 space-y-2">
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={fetchNotifications}>
                Retry
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No notifications"
                description={
                  unreadOnly
                    ? 'You have caught up with all notifications.'
                    : 'No alerts or status updates recorded yet.'
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notif) => {
                const isUnread = notif.is_read === 0;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-gray-50/80 ${
                      isUnread ? 'bg-primary-50/20' : 'bg-white'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 shrink-0 mt-0.5">
                      {renderIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notif.message}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" title="Unread" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                        <span>
                          {new Date(notif.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {notif.complaint_id && (
                          <span className="text-primary-600 font-semibold hover:underline inline-flex items-center">
                            Grievance #{notif.complaint_id} <ArrowRight className="w-3 h-3 ml-0.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <button
                        title="Mark as Read"
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-white border border-transparent hover:border-gray-200 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
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
    </div>
  );
}
