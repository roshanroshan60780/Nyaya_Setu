import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Scale, GraduationCap, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function LoginSelectPage() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top bar with back to home */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Homepage</span>
        </Link>

        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-500 via-white to-accent-600 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary-700" />
          </div>
          <span className="font-bold text-gray-900">
            <span className="text-saffron-600">Nyaya</span>
            <span className="text-primary-600">Setu</span>
          </span>
        </Link>
      </div>

      {/* Main role selection cards */}
      <div className="max-w-3xl w-full mx-auto my-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold mb-4">
          <span>Role-Based Authentication</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
          Choose Your Login Portal
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          NyayaSetu provides dedicated, role-isolated portals to maintain accountability and security across grievance redressal.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10 text-left">
          {/* Student Login Card */}
          <Link
            to="/login/student"
            className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-primary-600 group-hover:text-white transition-all duration-200">
                <GraduationCap className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                Enrolled Students
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1 mb-2">Student Portal</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Log in to file grievances, upload supporting evidence, participate in discussion threads, and verify cryptographic audit seals.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-primary-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Authority Login Card */}
          <Link
            to="/login/authority"
            className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-saffron-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-saffron-50 text-saffron-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-saffron-600 group-hover:text-white transition-all duration-200">
                <Building2 className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-saffron-600">
                University Administration
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1 mb-2">Authority Portal</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                For designated grievance officers, departmental heads, and university administrators to review, assign, and resolve student grievances.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-saffron-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              <span>Sign In as Authority</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Register CTA */}
        <div className="mt-10 p-5 rounded-xl bg-gray-100/70 border border-gray-200 text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
          <span>Don't have an active NyayaSetu account?</span>
          <Link to="/register">
            <Button variant="secondary" size="sm" className="font-semibold bg-white">
              Create an Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} NyayaSetu • College Grievance Redressal Portal
      </div>
    </div>
  );
}
