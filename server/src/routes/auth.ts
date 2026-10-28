import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import db from '../db/database';
import { authenticate, JWT_SECRET } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest, User, EmailVerification } from '../types';
import {
  normalizeEmail,
  isValidMNNITEmail,
  generateOTP,
  hashOTP,
  verifyOTPHash,
} from '../utils/emailValidation';
import { sendOTPEmail, getMailerStatus, SendOTPResult } from '../utils/mailer';

const router = Router();

// Rate limiter for OTP dispatch endpoints (max 10 requests per 15 minutes in production)
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this IP. Please try again after 15 minutes.' },
});

// Rate limiter for OTP verification attempts (max 15 attempts per 15 minutes in production)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts from this IP. Please try again after 15 minutes.' },
});

/** Zod schema for student registration initiation */
const registerSchema = z.object({
  email: z.string().trim().toLowerCase(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().optional(),
});

/** Zod schema for login */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum(['student', 'admin']).optional(),
});

/** Zod schema for authority access request initiation */
const authorityRequestSchema = z.object({
  email: z.string().trim().toLowerCase(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation / role title is required'),
  employee_id: z.string().min(1, 'Employee ID is required'),
  justification: z.string().min(10, 'Please provide a justification (at least 10 characters)'),
});

/** Zod schema for verifying OTP */
const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase(),
  otp: z.string().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
  verificationType: z.enum(['student_registration', 'authority_request']),
});

/** Zod schema for resending OTP */
const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase(),
  verificationType: z.enum(['student_registration', 'authority_request']),
});

/**
 * POST /api/auth/register
 * Step 1 of student registration: validates exact @mnnit.ac.in domain, checks duplicates,
 * generates a 6-digit OTP, and dispatches it to the student's email via SMTP.
 */
router.post('/register', otpSendLimiter, validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, department } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Strict domain check: exact 'mnnit.ac.in' required
    if (!isValidMNNITEmail(normalizedEmail)) {
      res.status(400).json({
        error: 'Only valid @mnnit.ac.in email addresses are accepted for registration.',
      });
      return;
    }

    // Check if verified user already exists
    const existingUser = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(normalizedEmail) as
      | { id: number; is_verified: number }
      | undefined;

    if (existingUser && existingUser.is_verified === 1) {
      res.status(409).json({ error: 'An active account with this email already exists.' });
      return;
    }

    // Generate 6-digit cryptographic OTP and its secure hash
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const passwordHash = bcrypt.hashSync(password, 12);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Attempt OTP delivery before recording challenge
    let mailResult: SendOTPResult;
    try {
      mailResult = await sendOTPEmail(normalizedEmail, otp, 'Student Registration');
    } catch (mailError: any) {
      console.error('SMTP Delivery error during student registration:', mailError?.message || mailError);
      res.status(503).json({
        error: mailError?.message || 'Unable to deliver verification email. Please verify SMTP configuration in server/.env.',
      });
      return;
    }

    // Replace any existing unexpired challenge for this email & type
    db.prepare("DELETE FROM email_verifications WHERE email = ? AND verification_type = 'student_registration'").run(
      normalizedEmail
    );

    const payload = JSON.stringify({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      department: department?.trim() || null,
    });

    db.prepare(`
      INSERT INTO email_verifications (email, otp_hash, verification_type, payload, attempts, expires_at)
      VALUES (?, ?, 'student_registration', ?, 0, ?)
    `).run(normalizedEmail, otpHash, payload, expiresAt);

    res.status(200).json({
      message: mailResult.mode === 'development'
        ? 'Local Development Mode: Verification code logged to backend terminal.'
        : 'Verification code sent to your MNNIT email address.',
      email: normalizedEmail,
      verificationType: 'student_registration',
      expiresInMinutes: 5,
      deliveryMode: mailResult.mode,
      devNotice: mailResult.devNotice,
    });
  } catch (error) {
    console.error('Registration initiation error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/authority-request
 * Step 1 of authority access request: validates exact @mnnit.ac.in domain,
 * generates a 6-digit OTP, and dispatches it via SMTP.
 */
router.post('/authority-request', otpSendLimiter, validate(authorityRequestSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password, department, designation, employee_id, justification } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Strict domain check: exact 'mnnit.ac.in' required
    if (!isValidMNNITEmail(normalizedEmail)) {
      res.status(400).json({
        error: 'Only valid @mnnit.ac.in email addresses are accepted for authority access requests.',
      });
      return;
    }

    // Check if account already exists as verified user
    const existingUser = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(normalizedEmail) as
      | { id: number; is_verified: number }
      | undefined;
    if (existingUser && existingUser.is_verified === 1) {
      res.status(409).json({ error: 'An active user account with this email already exists.' });
      return;
    }

    // Check if pending verified request already exists in queue
    const existingRequest = db.prepare(
      "SELECT id FROM authority_requests WHERE email = ? AND status = 'pending' AND is_verified = 1"
    ).get(normalizedEmail);
    if (existingRequest) {
      res.status(409).json({ error: 'An authority request for this email is already awaiting administrator review.' });
      return;
    }

    // Generate 6-digit cryptographic OTP and its secure hash
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const passwordHash = bcrypt.hashSync(password, 12);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Attempt OTP delivery before recording challenge
    let mailResult: SendOTPResult;
    try {
      mailResult = await sendOTPEmail(normalizedEmail, otp, 'Authority Access Request');
    } catch (mailError: any) {
      console.error('SMTP Delivery error during authority request:', mailError?.message || mailError);
      res.status(503).json({
        error: mailError?.message || 'Unable to deliver verification email. Please verify SMTP configuration in server/.env.',
      });
      return;
    }

    // Replace any existing challenge for this email & type
    db.prepare("DELETE FROM email_verifications WHERE email = ? AND verification_type = 'authority_request'").run(
      normalizedEmail
    );

    const payload = JSON.stringify({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      department: department.trim(),
      designation: designation.trim(),
      employee_id: employee_id.trim(),
      justification: justification.trim(),
    });

    db.prepare(`
      INSERT INTO email_verifications (email, otp_hash, verification_type, payload, attempts, expires_at)
      VALUES (?, ?, 'authority_request', ?, 0, ?)
    `).run(normalizedEmail, otpHash, payload, expiresAt);

    res.status(200).json({
      message: mailResult.mode === 'development'
        ? 'Local Development Mode: Verification code logged to backend terminal.'
        : 'Verification code sent to your official MNNIT email address.',
      email: normalizedEmail,
      verificationType: 'authority_request',
      expiresInMinutes: 5,
      deliveryMode: mailResult.mode,
      devNotice: mailResult.devNotice,
    });
  } catch (error) {
    console.error('Authority request error:', error);
    res.status(500).json({ error: 'Failed to submit authority request. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2: Validates the single-use 6-digit OTP against its secure HMAC hash.
 */
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), (req: Request, res: Response): void => {
  try {
    const { email, otp, verificationType } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const challenge = db.prepare(`
      SELECT * FROM email_verifications 
      WHERE email = ? AND verification_type = ? 
      ORDER BY id DESC LIMIT 1
    `).get(normalizedEmail, verificationType) as EmailVerification | undefined;

    if (!challenge) {
      res.status(400).json({
        error: 'No active verification challenge found for this email address. Please register again.',
      });
      return;
    }

    // Check expiry (5 minutes using UTC ISO string)
    const expiresAt = new Date(challenge.expires_at).getTime();
    if (Date.now() > expiresAt) {
      db.prepare('DELETE FROM email_verifications WHERE id = ?').run(challenge.id);
      res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    // Check attempt threshold (maximum 5 attempts)
    if (challenge.attempts >= challenge.max_attempts) {
      db.prepare('DELETE FROM email_verifications WHERE id = ?').run(challenge.id);
      res.status(429).json({ error: 'Maximum verification attempts exceeded. Please request a new code.' });
      return;
    }

    // Verify OTP against stored HMAC hash
    const isMatch = verifyOTPHash(otp.trim(), challenge.otp_hash);
    if (!isMatch) {
      const newAttempts = challenge.attempts + 1;
      db.prepare('UPDATE email_verifications SET attempts = ? WHERE id = ?').run(newAttempts, challenge.id);
      const remaining = challenge.max_attempts - newAttempts;
      res.status(400).json({
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Invalid verification code. Maximum attempts reached. Please request a new code.',
      });
      return;
    }

    // Code is valid: execute activation inside an immediate database transaction
    const completeTx = db.transaction(() => {
      // Invalidate all challenges for this email
      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizedEmail);

      const payload = JSON.parse(challenge.payload);

      if (verificationType === 'student_registration') {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as
          | { id: number }
          | undefined;

        if (existing) {
          db.prepare(`
            UPDATE users SET name = ?, password_hash = ?, department = ?, is_verified = 1
            WHERE id = ?
          `).run(payload.name, payload.passwordHash, payload.department || null, existing.id);
        } else {
          db.prepare(`
            INSERT INTO users (email, name, password_hash, role, department, is_verified)
            VALUES (?, ?, ?, 'student', ?, 1)
          `).run(normalizedEmail, payload.name, payload.passwordHash, payload.department || null);
        }
      } else {
        // Authority request: store verified request for admin review
        db.prepare(`
          INSERT INTO authority_requests (name, email, password_hash, department, designation, employee_id, justification, status, is_verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1)
        `).run(
          payload.name,
          normalizedEmail,
          payload.passwordHash,
          payload.department,
          payload.designation,
          payload.employee_id,
          payload.justification
        );
      }
    });

    completeTx();

    if (verificationType === 'student_registration') {
      res.json({
        message: 'Email verified successfully! Your student account is now active. You may now sign in.',
        verified: true,
        verificationType,
      });
    } else {
      res.json({
        message: 'Email verified successfully! Your authority request has been logged and is pending administrator approval.',
        verified: true,
        verificationType,
        pendingApproval: true,
      });
    }
  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resends a fresh 6-digit OTP to the applicant's email address, resetting attempts and renewing expiry.
 */
router.post('/resend-otp', otpSendLimiter, validate(resendOtpSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, verificationType } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const challenge = db.prepare(`
      SELECT * FROM email_verifications 
      WHERE email = ? AND verification_type = ? 
      ORDER BY id DESC LIMIT 1
    `).get(normalizedEmail, verificationType) as EmailVerification | undefined;

    if (!challenge) {
      res.status(400).json({ error: 'No active verification challenge found. Please submit your registration again.' });
      return;
    }

    const newOtp = generateOTP();
    const newOtpHash = hashOTP(newOtp);
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    let mailResult: SendOTPResult;
    try {
      mailResult = await sendOTPEmail(
        normalizedEmail,
        newOtp,
        verificationType === 'student_registration' ? 'Student Registration' : 'Authority Access Request'
      );
    } catch (mailError: any) {
      console.error('Resend OTP error:', mailError?.message || mailError);
      res.status(503).json({
        error: mailError?.message || 'Unable to deliver verification email. Please verify SMTP configuration.',
      });
      return;
    }

    db.prepare(`
      UPDATE email_verifications 
      SET otp_hash = ?, attempts = 0, expires_at = ?, created_at = datetime('now')
      WHERE id = ?
    `).run(newOtpHash, newExpiresAt, challenge.id);

    res.json({
      message: mailResult.mode === 'development'
        ? 'Local Development Mode: A fresh verification code has been logged to your backend terminal.'
        : 'A new 6-digit verification code has been dispatched to your MNNIT email.',
      expiresInMinutes: 5,
      deliveryMode: mailResult.mode,
      devNotice: mailResult.devNotice,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend verification code.' });
  }
});

/**
 * GET /api/auth/delivery-status
 * Returns current email delivery configuration state for the UI.
 * Informs the frontend whether the server is dispatching real emails or using local terminal logging.
 */
router.get('/delivery-status', (_req: Request, res: Response): void => {
  const status = getMailerStatus();
  const isDev = process.env.NODE_ENV !== 'production';
  const mode = status.configured ? 'smtp' : (isDev ? 'development' : 'unconfigured');

  res.json({
    configured: status.configured,
    deliveryMode: mode,
    isDevelopment: isDev,
    notice: mode === 'development'
      ? 'Local Development Mode Active: Verification codes are logged directly to the backend server terminal.'
      : (mode === 'smtp' ? 'SMTP configured for live email delivery.' : 'SMTP not configured in production.'),
  });
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password, returning a JWT token.
 * 
 * Enforcements:
 * - Checks that account is verified (is_verified === 1).
 * - Enforces expectedRole for role-isolated portals.
 */
router.post('/login', validate(loginSchema), (req: Request, res: Response): void => {
  try {
    const { email, password, expectedRole } = req.body;
    const normalizedEmail = normalizeEmail(email);

    // Look up user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Strict account verification check
    if (user.is_verified === 0) {
      res.status(403).json({
        error: 'Your email address has not been verified. Please verify your email before logging in.',
      });
      return;
    }

    // Server-enforced role verification when logging in via role-specific portals
    if (expectedRole && user.role !== expectedRole) {
      res.status(401).json({ error: 'Invalid email or password for this portal.' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = db.prepare(
      'SELECT id, email, name, role, department, is_verified, created_at FROM users WHERE id = ?'
    ).get(req.user!.id) as Omit<User, 'password_hash'> | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

export default router;
