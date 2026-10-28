import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Building2,
  Terminal,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';
import { normalizeEmail, isValidMNNITEmail } from '../lib/validation';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email and verificationType from route state or URL params
  const state = location.state as {
    email?: string;
    verificationType?: 'student_registration' | 'authority_request';
    deliveryMode?: 'smtp' | 'development';
    devNotice?: string;
  } | null;
  const searchParams = new URLSearchParams(location.search);

  const initialEmail = state?.email || searchParams.get('email') || '';
  const initialType = state?.verificationType || (searchParams.get('type') as any) || 'student_registration';

  const [email, setEmail] = useState<string>(initialEmail);
  const [verificationType, setVerificationType] = useState<'student_registration' | 'authority_request'>(initialType);
  const [deliveryMode, setDeliveryMode] = useState<'smtp' | 'development' | null>(
    state?.deliveryMode || null
  );
  const [devNotice, setDevNotice] = useState<string>(state?.devNotice || '');
  const [otp, setOtp] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Probe delivery status if not already known from navigation state
  useEffect(() => {
    try {
      const probe = api.get('/auth/delivery-status');
      if (probe && typeof probe.then === 'function') {
        probe
          .then((res: any) => {
            if (res?.data?.deliveryMode === 'development') {
              setDeliveryMode('development');
              if (!devNotice && res.data?.notice) {
                setDevNotice(res.data.notice);
              }
            } else if (res?.data?.deliveryMode === 'smtp') {
              setDeliveryMode('smtp');
            }
          })
          .catch(() => {
            // Fallback silently if endpoint is unavailable
          });
      }
    } catch {
      // Ignore probing errors in testing or offline states
    }
  }, [devNotice]);

  // Resend countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0 && !canResend) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, canResend]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const normalized = normalizeEmail(email);

    if (!normalized) {
      setError('Email address is required.');
      return;
    }

    if (!isValidMNNITEmail(normalized)) {
      setError('Please provide a valid @mnnit.ac.in email address.');
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: normalized,
        otp: otp.trim(),
        verificationType,
      });

      setIsVerified(true);
      setSuccessNotice(response.data.message || 'Email verified successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Verification failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;

    setError('');
    setSuccessNotice('');
    const normalized = normalizeEmail(email);

    if (!normalized || !isValidMNNITEmail(normalized)) {
      setError('Valid @mnnit.ac.in email address required to resend code.');
      return;
    }

    setResending(true);
    try {
      const response = await api.post('/auth/resend-otp', {
        email: normalized,
        verificationType,
      });

      if (response.data.deliveryMode) {
        setDeliveryMode(response.data.deliveryMode);
      }
      if (response.data.devNotice) {
        setDevNotice(response.data.devNotice);
      }

      setSuccessNotice(
        response.data.deliveryMode === 'development'
          ? 'Local Development Mode: Fresh 6-digit OTP code logged to your backend terminal!'
          : (response.data.message || 'A fresh verification code has been dispatched.')
      );
      setCanResend(false);
      setCountdown(60);
      setOtp('');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
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

      {/* Main Verification Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {isVerified ? (
            /* Verified Success State */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-3">
                Email Successfully Verified
              </span>
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">
                {verificationType === 'student_registration'
                  ? 'Student Account Activated!'
                  : 'Authority Request Logged!'}
              </h2>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                {verificationType === 'student_registration'
                  ? 'Your @mnnit.ac.in student credentials have been confirmed. You may now sign in to file and track grievances.'
                  : 'Your official authority request is verified and pending administrator approval. Once verified by the Dean/Admin, your access will be activated.'}
              </p>

              <div className="mt-8">
                {verificationType === 'student_registration' ? (
                  <Button
                    size="lg"
                    onClick={() => navigate('/login/student')}
                    className="w-full font-semibold shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Student Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate('/login/authority')}
                    className="w-full font-semibold shadow-md bg-saffron-600 hover:bg-saffron-700 focus:ring-saffron-500 flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Authority Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* OTP Entry Form */
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                  {deliveryMode === 'development' ? <Terminal className="w-7 h-7 text-amber-600" /> : <Mail className="w-7 h-7" />}
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>MNNIT Email OTP Verification</span>
                </div>
                <h1 className="text-2xl font-black text-gray-950 tracking-tight">Verify Your Email</h1>
                <p className="text-xs text-gray-500 mt-1">
                  {deliveryMode === 'development'
                    ? 'Enter the 6-digit code logged in your backend server terminal'
                    : <>Enter the 6-digit code sent to your official <strong className="text-gray-800">@mnnit.ac.in</strong> email</>}
                </p>
              </div>

              {/* Local Development Mode Informational Card */}
              {deliveryMode === 'development' && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 leading-relaxed shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-amber-950 mb-1.5">
                    <Terminal className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span className="uppercase tracking-wide text-[10px] bg-amber-200/90 px-2 py-0.5 rounded-full font-extrabold text-amber-900">
                      Local Development Mode Active
                    </span>
                  </div>
                  <p className="text-amber-900 font-medium">
                    SMTP is not configured in this local environment. Your 6-digit verification code has been printed directly to your <strong>backend terminal console</strong>.
                  </p>
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-100/90 border border-amber-300/80 font-mono text-[11px] text-amber-950 space-y-1">
                    <div>1. Open your terminal running <code className="font-bold text-amber-900">npm run dev</code> (server).</div>
                    <div>2. Look for the banner: <span className="font-bold text-amber-900">[NYAYASETU LOCAL DEV MODE]</span>.</div>
                    <div>3. Copy the 6-digit OTP code and enter it below.</div>
                  </div>
                </div>
              )}

              {/* Status / Error Alerts */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successNotice && !error && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{successNotice}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4" noValidate>
                <div>
                  <Input
                    label="MNNIT Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your_roll@mnnit.ac.in"
                    helperText="Must be an exact @mnnit.ac.in email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="otp-input" className="block text-sm font-medium text-gray-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="block w-full text-center text-3xl font-mono tracking-widest py-3 px-4 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-colors shadow-sm"
                    autoFocus
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500 text-center">
                    Code expires in 5 minutes (maximum 5 attempts)
                  </p>
                </div>

                <Button type="submit" loading={loading} className="w-full font-semibold shadow-sm mt-2" size="lg">
                  Verify Email & Activate
                </Button>
              </form>

              {/* Resend OTP Section */}
              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center justify-between gap-3 text-xs">
                <div className="text-gray-500">
                  Didn't receive the email code?
                </div>
                <button
                  type="button"
                  disabled={!canResend || resending}
                  onClick={handleResend}
                  className={`inline-flex items-center gap-1.5 font-bold transition-colors ${
                    canResend
                      ? 'text-primary-600 hover:text-primary-800 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {canResend ? 'Resend Verification Code' : `Resend code in ${countdown}s`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} NyayaSetu • MNNIT Prayagraj Grievance Portal
      </div>
    </div>
  );
}
