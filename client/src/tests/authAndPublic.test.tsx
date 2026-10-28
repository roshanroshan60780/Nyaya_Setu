import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginSelectPage from '../pages/LoginSelectPage';
import RegisterSelectPage from '../pages/RegisterSelectPage';
import StudentLoginPage from '../pages/StudentLoginPage';
import AuthorityLoginPage from '../pages/AuthorityLoginPage';
import StudentRegisterPage from '../pages/StudentRegisterPage';
import AuthorityRegisterPage from '../pages/AuthorityRegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import PublicDashboard from '../pages/PublicDashboard';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}

describe('Public Dashboard & Role Authentication Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('LoginSelectPage', () => {
    it('renders both Student and Authority portal options', () => {
      renderWithProviders(<LoginSelectPage />);
      expect(screen.getByText('Choose Your Login Portal')).toBeInTheDocument();
      expect(screen.getByText('Student Portal')).toBeInTheDocument();
      expect(screen.getByText('Authority Portal')).toBeInTheDocument();
      expect(screen.getByText('Sign In as Student')).toBeInTheDocument();
      expect(screen.getByText('Sign In as Authority')).toBeInTheDocument();
    });
  });

  describe('RegisterSelectPage', () => {
    it('renders both Student and Authority registration pathways', () => {
      renderWithProviders(<RegisterSelectPage />);
      expect(screen.getByText('Select Your Registration Type')).toBeInTheDocument();
      expect(screen.getByText('Student Registration')).toBeInTheDocument();
      expect(screen.getByText('Authority Access Request')).toBeInTheDocument();
      expect(screen.getByText('Admin Approval Required')).toBeInTheDocument();
    });
  });

  describe('StudentLoginPage', () => {
    it('renders student-specific email and password inputs with submit button', () => {
      renderWithProviders(<StudentLoginPage />);
      expect(screen.getByText('Student Portal Login')).toBeInTheDocument();
      expect(screen.getByLabelText('Student Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Student Portal/i })).toBeInTheDocument();
    });

    it('displays client validation errors for empty inputs', async () => {
      renderWithProviders(<StudentLoginPage />);
      const submitBtn = screen.getByRole('button', { name: /Sign In to Student Portal/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Student email address is required.')).toBeInTheDocument();
      });
    });

    it('renders demo credentials banner for quick evaluation', () => {
      renderWithProviders(<StudentLoginPage />);
      expect(screen.getByText('Demo Student:')).toBeInTheDocument();
      expect(screen.getByText('student1@mnnit.ac.in')).toBeInTheDocument();
    });
  });

  describe('AuthorityLoginPage', () => {
    it('renders authority-specific badge and official email input', () => {
      renderWithProviders(<AuthorityLoginPage />);
      expect(screen.getByText('Authority Portal Login')).toBeInTheDocument();
      expect(screen.getByText('Privileged Authority Access')).toBeInTheDocument();
      expect(screen.getByLabelText('Official Email Address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Authority Portal/i })).toBeInTheDocument();
    });

    it('renders demo credentials banner for quick evaluation', () => {
      renderWithProviders(<AuthorityLoginPage />);
      expect(screen.getByText('Demo Authority:')).toBeInTheDocument();
      expect(screen.getByText('admin@mnnit.ac.in')).toBeInTheDocument();
    });
  });

  describe('StudentRegisterPage', () => {
    it('enforces exact @mnnit.ac.in domain on student registration', async () => {
      renderWithProviders(<StudentRegisterPage />);

      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test Student' } });
      fireEvent.change(screen.getByLabelText('Student Email Address'), { target: { value: 'student@gmail.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password@123' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password@123' } });

      const submitBtn = screen.getByRole('button', { name: /Create Student Account/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Email must be an exact @mnnit.ac.in address/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('AuthorityRegisterPage', () => {
    it('renders approval workflow notice and security justification field', () => {
      renderWithProviders(<AuthorityRegisterPage />);
      expect(screen.getByText('Request Authority Access')).toBeInTheDocument();
      expect(screen.getByText('Admin Approval Workflow Required')).toBeInTheDocument();
      expect(screen.getByLabelText(/Reason & Justification/i)).toBeInTheDocument();
    });

    it('enforces exact @mnnit.ac.in domain on authority request', async () => {
      renderWithProviders(<AuthorityRegisterPage />);

      fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Prof. Test' } });
      fireEvent.change(screen.getByLabelText('Official Email Address'), { target: { value: 'faculty@mnnit.edu.in' } });
      fireEvent.change(screen.getByLabelText('Department / Office'), { target: { value: 'CSE' } });
      fireEvent.change(screen.getByLabelText('Official Designation'), { target: { value: 'HOD' } });
      fireEvent.change(screen.getByLabelText('Employee / Staff ID'), { target: { value: 'EMP-001' } });
      fireEvent.change(screen.getByLabelText(/Reason & Justification/i), { target: { value: 'Evaluating grievance portal as HOD.' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password@123' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password@123' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Authority Request for Review/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Email must be an exact @mnnit.ac.in address/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('VerifyEmailPage', () => {
    it('renders OTP input and handles 6-digit validation', async () => {
      renderWithProviders(<VerifyEmailPage />);
      expect(screen.getByText('Verify Your Email')).toBeInTheDocument();
      expect(screen.getByLabelText('MNNIT Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('6-Digit Verification Code')).toBeInTheDocument();

      const verifyBtn = screen.getByRole('button', { name: /Verify Email & Activate/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      });
    });

    it('verifies code successfully when valid 6-digit OTP is supplied', async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { message: 'Email verified successfully! You may now sign in.' },
      });

      renderWithProviders(<VerifyEmailPage />);

      fireEvent.change(screen.getByLabelText('MNNIT Email Address'), {
        target: { value: 'newstudent@mnnit.ac.in' },
      });
      fireEvent.change(screen.getByLabelText('6-Digit Verification Code'), {
        target: { value: '123456' },
      });

      const verifyBtn = screen.getByRole('button', { name: /Verify Email & Activate/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', {
          email: 'newstudent@mnnit.ac.in',
          otp: '123456',
          verificationType: 'student_registration',
        });
        expect(screen.getByText('Student Account Activated!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Proceed to Student Login/i })).toBeInTheDocument();
      });
    });

    it('displays local development mode banner when probe returns deliveryMode development', async () => {
      (api.get as any).mockResolvedValueOnce({
        data: {
          configured: false,
          deliveryMode: 'development',
          isDevelopment: true,
          notice: 'Local Development Mode Active: Verification codes are logged directly to the backend server terminal.',
        },
      });

      renderWithProviders(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('Local Development Mode Active')).toBeInTheDocument();
        expect(screen.getByText(/SMTP is not configured in this local environment/i)).toBeInTheDocument();
        expect(screen.getByText(/\[NYAYASETU LOCAL DEV MODE\]/i)).toBeInTheDocument();
      });
    });
  });

  describe('PublicDashboard', () => {
    it('loads and displays aggregate statistics without authentication', async () => {
      (api.get as any).mockResolvedValueOnce({
        data: {
          totalComplaints: 42,
          pendingComplaints: 10,
          inProgressComplaints: 12,
          resolvedComplaints: 15,
          closedComplaints: 3,
          escalatedComplaints: 2,
          resolutionRate: 42.9,
          byCategory: { academic: 20, infrastructure: 22 },
          pendingDefinition: "Pending complaints are registered grievances in 'open' status.",
          resolutionFormula: "Resolution Rate = ((Resolved + Closed) / Total) * 100",
          lastUpdated: '2026-10-28T21:00:00.000Z',
        },
      });

      renderWithProviders(<PublicDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice Matters.')).toBeInTheDocument();
        expect(screen.getByText('Institutional Redressal Statistics')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument(); // total
        expect(screen.getByText('42.9%')).toBeInTheDocument(); // resolution rate
        expect(screen.getByText('How Grievances Move from Submission to Resolution')).toBeInTheDocument();
      });
    });

    it('renders error state and retry option when stats API fails', async () => {
      (api.get as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<PublicDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Statistics Unavailable')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
      });
    });
  });
});
