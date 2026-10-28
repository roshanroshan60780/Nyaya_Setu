import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Scale, Building2, Lock, Mail, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function AuthorityLoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Official email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid official email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      // Pass expectedRole 'admin' to enforce backend verification
      await login(email.trim(), password, 'admin');
      navigate('/admin');
    } catch (err: any) {
      const serverMessage = err.response?.data?.error || err.response?.data?.message;
      setError(
        serverMessage ||
        'Unable to sign in. Please verify your credentials or ensure this account has authority/officer privileges.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Navigation Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-saffron-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Switch Portal</span>
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron-500 via-white to-accent-600 flex items-center justify-center">
            <Scale className="w-4 h-4 text-primary-700" />
          </div>
          <span className="font-bold text-sm text-gray-900">
            <span className="text-saffron-600">Nyaya</span>
            <span className="text-primary-600">Setu</span>
          </span>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-saffron-50 text-saffron-600 flex items-center justify-center mx-auto mb-4 border border-saffron-100 shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-saffron-100 text-saffron-900 text-[11px] font-semibold mb-2">
              <Shield className="w-3 h-3 text-saffron-700" />
              <span>Privileged Authority Access</span>
            </div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">Authority Portal Login</h1>
            <p className="text-xs text-gray-500 mt-1">
              Sign in for grievance redressal officers, committee members, and university administrators
            </p>
          </div>

          {/* Evaluation Demo Credentials */}
          <div className="mb-5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-amber-950">Demo Authority:</span>
              <code className="ml-1 px-1.5 py-0.5 rounded bg-amber-100/90 font-mono text-[11px] text-amber-900 font-bold">admin@mnnit.ac.in</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[11px]">Password:</span>
              <code className="px-1.5 py-0.5 rounded bg-amber-100/90 font-mono text-[11px] text-amber-900 font-bold">Admin@123</code>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@mnnit.ac.in');
                  setPassword('Admin@123');
                }}
                className="text-[11px] text-amber-800 font-bold hover:underline ml-1 cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              <div>{error}</div>
              {(error.toLowerCase().includes('verif') || error.toLowerCase().includes('otp')) && (
                <div className="mt-2 pt-2 border-t border-red-200/60 flex items-center justify-between">
                  <span>Need to complete email verification?</span>
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(email)}&type=authority_request`}
                    className="font-bold text-red-900 hover:underline"
                  >
                    Verify OTP Now &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Input
                label="Official Email Address"
                type="email"
                placeholder="e.g. admin@mnnit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter authority password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2 font-semibold shadow-sm bg-saffron-600 hover:bg-saffron-700 focus:ring-saffron-500"
              size="lg"
            >
              Sign In to Authority Portal
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Need authority access for your department?{' '}
              <Link to="/register/authority" className="font-bold text-saffron-600 hover:text-saffron-700 underline underline-offset-2">
                Request Access
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Are you a student?{' '}
              <Link to="/login/student" className="font-medium text-gray-600 hover:text-gray-800">
                Go to Student Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} NyayaSetu • Authority Grievance Management System
      </div>
    </div>
  );
}
