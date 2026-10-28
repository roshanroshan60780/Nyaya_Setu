import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public & Authentication Pages
import PublicDashboard from './pages/PublicDashboard';
import LoginSelectPage from './pages/LoginSelectPage';
import StudentLoginPage from './pages/StudentLoginPage';
import AuthorityLoginPage from './pages/AuthorityLoginPage';
import RegisterSelectPage from './pages/RegisterSelectPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import AuthorityRegisterPage from './pages/AuthorityRegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

// Authenticated Application Pages
import StudentDashboard from './pages/StudentDashboard';
import NewComplaintPage from './pages/NewComplaintPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* ─── Public Routes (No authentication required) ────────────────────────── */}
      <Route path="/" element={<PublicDashboard />} />
      <Route path="/login" element={<LoginSelectPage />} />
      <Route path="/login/student" element={<StudentLoginPage />} />
      <Route path="/login/authority" element={<AuthorityLoginPage />} />
      <Route path="/register" element={<RegisterSelectPage />} />
      <Route path="/register/student" element={<StudentRegisterPage />} />
      <Route path="/register/authority" element={<AuthorityRegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* ─── Student Protected Routes ────────────────────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="student">
            <Layout><StudentDashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/complaints/new"
        element={
          <ProtectedRoute requiredRole="student">
            <Layout><NewComplaintPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ─── Authority / Admin Protected Routes ───────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/complaints"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout><AdminComplaintsPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout><AnalyticsPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ─── Shared Protected Routes (Student & Admin) ────────────────────────── */}
      <Route
        path="/complaints/:id"
        element={
          <ProtectedRoute>
            <Layout><ComplaintDetailPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout><NotificationsPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* ─── Catch-all 404 Route ──────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
