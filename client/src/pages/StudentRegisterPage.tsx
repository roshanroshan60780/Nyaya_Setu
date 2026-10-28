import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Scale, GraduationCap, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { isValidMNNITEmail, normalizeEmail } from '../lib/validation';

export default function StudentRegisterPage() {
  const { register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Full name is required';
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (!email.trim()) errs.email = 'University email address is required';
    else if (!isValidMNNITEmail(email)) errs.email = 'Email must be an exact @mnnit.ac.in address (e.g. roll_no@mnnit.ac.in)';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';

    if (!confirmPassword) errs.confirmPassword = 'Confirmation password is required';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const cleanEmail = normalizeEmail(email);
      const res = await register(name.trim(), cleanEmail, password, department.trim() || undefined);
      navigate('/verify-email', {
        state: {
          email: cleanEmail,
          verificationType: 'student_registration',
          deliveryMode: res.deliveryMode,
          devNotice: res.devNotice,
        },
      });
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed. Please check your details or try again.'
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
          to="/register"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Switch Registration</span>
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

      {/* Main Register Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4 border border-primary-100 shadow-sm">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-[11px] font-semibold mb-2">
              Student Registration
            </div>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">Create Student Account</h1>
            <p className="text-xs text-gray-500 mt-1">
              Register to submit grievances, upload evidence, and receive real-time notifications
            </p>
          </div>

          {serverError && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <Input
                label="Full Name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                required
              />
            </div>

            <div>
              <Input
                label="Student Email Address"
                type="email"
                placeholder="e.g. 2024cs01@mnnit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                helperText="Must be an official @mnnit.ac.in email address"
                required
              />
            </div>

            <div>
              <Input
                label="Department / Course"
                type="text"
                placeholder="e.g. Computer Science, Mechanical Eng."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                helperText="Optional: helps route your grievances more efficiently"
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
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

            <div>
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2 font-semibold shadow-sm" size="lg">
              Create Student Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-500">
              Already have a student account?{' '}
              <Link to="/login/student" className="font-bold text-primary-600 hover:text-primary-700 underline underline-offset-2">
                Sign in here
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Seeking administrative authority access?{' '}
              <Link to="/register/authority" className="font-medium text-gray-600 hover:text-gray-800">
                Submit an Access Request
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} NyayaSetu • Student Grievance Portal
      </div>
    </div>
  );
}
