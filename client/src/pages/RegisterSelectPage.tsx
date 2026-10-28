import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Scale, GraduationCap, Building2, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function RegisterSelectPage() {
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

      {/* Main selection section */}
      <div className="max-w-3xl w-full mx-auto my-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold mb-4">
          <span>Account Registration & Onboarding</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
          Select Your Registration Type
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
          Choose whether you are enrolling as a student to file complaints or requesting departmental authority credentials.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10 text-left">
          {/* Student Registration Card */}
          <Link
            to="/register/student"
            className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-primary-600 group-hover:text-white transition-all duration-200">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  Students
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Instant Activation
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Registration</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Create an account using your university email to file complaints, submit evidence, and track institutional resolutions.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-primary-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              <span>Register Student Account</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Authority Registration Card */}
          <Link
            to="/register/authority"
            className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-saffron-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-saffron-50 text-saffron-600 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-saffron-600 group-hover:text-white transition-all duration-200">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-600">
                  College Officers
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-700" />
                  <span>Admin Approval Required</span>
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Authority Access Request</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Submit an official request for officer credentials. To safeguard campus security, requests are verified by university administrators before activation.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-saffron-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              <span>Submit Authority Request</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Existing account prompt */}
        <div className="mt-10 p-5 rounded-xl bg-gray-100/70 border border-gray-200 text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-xl mx-auto">
          <span>Already registered with NyayaSetu?</span>
          <Link to="/login">
            <Button variant="secondary" size="sm" className="font-semibold bg-white">
              Sign In to Your Portal
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
