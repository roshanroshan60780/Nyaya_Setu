import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Scale, Building2, ShieldCheck, ShieldAlert, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import api from '../lib/api';
import { isValidMNNITEmail, normalizeEmail } from '../lib/validation';

export default function AuthorityRegisterPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [justification, setJustification] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Full name is required';
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (!email.trim()) errs.email = 'Official institutional email is required';
    else if (!isValidMNNITEmail(email)) errs.email = 'Email must be an exact @mnnit.ac.in address (e.g. name@mnnit.ac.in)';

    if (!department.trim()) errs.department = 'Department is required';
    if (!designation.trim()) errs.designation = 'Official designation is required';
    if (!employeeId.trim()) errs.employeeId = 'Employee / Faculty ID is required';

    if (!justification.trim()) errs.justification = 'Access justification is required';
    else if (justification.trim().length < 10) errs.justification = 'Please provide at least 10 characters explaining your role';

    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';

    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
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
      const res = await api.post('/auth/authority-request', {
        name: name.trim(),
        email: cleanEmail,
        department: department.trim(),
        designation: designation.trim(),
        employee_id: employeeId.trim(),
        justification: justification.trim(),
        password,
      });
      navigate('/verify-email', {
        state: {
          email: cleanEmail,
          verificationType: 'authority_request',
          deliveryMode: res.data?.deliveryMode,
          devNotice: res.data?.devNotice,
        },
      });
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to submit authority request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Navigation Bar */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-saffron-600 transition-colors"
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

      {/* Main Request Form or Success Card */}
      <div className="max-w-xl w-full mx-auto my-8">
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-3">
              Request Successfully Logged
            </span>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight">
              Authority Access Request Pending Review
            </h2>
            <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto leading-relaxed">
              Your official request for authority credentials has been received and securely stored in pending status.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-gray-200 text-left text-xs text-gray-600 space-y-2">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Applicant:</span>
                <span className="font-semibold text-gray-900">{name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Official Email:</span>
                <span className="font-semibold text-gray-900">{email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Department:</span>
                <span className="font-semibold text-gray-900">{department}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Designation:</span>
                <span className="font-semibold text-gray-900">{designation}</span>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                To preserve campus security and grievance confidentiality, university administrators verify credentials before granting access. Once approved, you can sign in directly via the Authority Portal.
              </span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/login/authority" className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full bg-saffron-600 hover:bg-saffron-700 focus:ring-saffron-500">
                  Go to Authority Login
                </Button>
              </Link>
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="secondary" size="md" className="w-full">
                  Return to Homepage
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-saffron-50 text-saffron-600 flex items-center justify-center mx-auto mb-4 border border-saffron-100 shadow-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Admin Approval Workflow Required</span>
              </div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                Request Authority Access
              </h1>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                For department heads, wardens, and administrative officers seeking grievance redressal credentials
              </p>
            </div>

            {/* Notice explaining approval */}
            <div className="mb-6 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 leading-relaxed">
              <strong>Security Protocol:</strong> Privileged administrator accounts are protected against arbitrary self-creation. Submitted applications require review and verification by an existing administrator before account activation.
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
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  required
                />
              </div>

              <div>
                <Input
                  label="Official Email Address"
                  type="email"
                  placeholder="e.g. warden@mnnit.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  helperText="Must be your official @mnnit.ac.in institutional email"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Department / Office"
                    type="text"
                    placeholder="e.g. Hostel Administration"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    error={errors.department}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="Official Designation"
                    type="text"
                    placeholder="e.g. Chief Warden / Registrar"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    error={errors.designation}
                    required
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Employee / Staff ID"
                  type="text"
                  placeholder="e.g. EMP-2024-912"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  error={errors.employeeId}
                  required
                />
              </div>

              <div>
                <TextArea
                  label="Reason & Justification for Authority Access"
                  placeholder="Briefly state your role and why your department requires grievance redressal permissions..."
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  error={errors.justification}
                  helperText="Minimum 10 characters; evaluated during administrative approval"
                  required
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

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-2 font-semibold shadow-sm bg-saffron-600 hover:bg-saffron-700 focus:ring-saffron-500"
                size="lg"
              >
                Submit Authority Request for Review
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
              <p className="text-xs text-gray-500">
                Already an approved authority?{' '}
                <Link to="/login/authority" className="font-bold text-saffron-600 hover:text-saffron-700 underline underline-offset-2">
                  Sign in to Authority Portal
                </Link>
              </p>
              <p className="text-xs text-gray-400">
                Are you a student?{' '}
                <Link to="/register/student" className="font-medium text-gray-600 hover:text-gray-800">
                  Register as Student
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} NyayaSetu • Institutional Authority Onboarding
      </div>
    </div>
  );
}
