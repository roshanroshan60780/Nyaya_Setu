import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { verifyAuditChain } from '../utils/audit';
import db from '../db/database';
import * as mailer from '../utils/mailer';

// Capture OTPs sent to emails for testing
const sentOtps: Record<string, string> = {};

let sendOTPSpy = vi.spyOn(mailer, 'sendOTPEmail').mockImplementation(async (email: string, otp: string) => {
  sentOtps[email] = otp;
  return { delivered: true, mode: 'smtp' };
});
let getMailerStatusSpy = vi.spyOn(mailer, 'getMailerStatus').mockReturnValue({ configured: true });

describe('NyayaSetu Backend API Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let mnnitAdminToken: string;
  let mnnitStudentToken: string;
  let createdComplaintId: number;

  beforeAll(async () => {
    // Seed database idempotently before running tests
    const seedModule = await import('../db/seed');
    seedModule.seed();

    // Obtain legacy admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nyayasetu.edu.in', password: 'Admin@123' });
    adminToken = adminLogin.body.token;

    // Obtain legacy student token
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul.sharma@student.edu.in', password: 'Student@123' });
    studentToken = studentLogin.body.token;

    // Obtain MNNIT admin token
    const mnnitAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mnnit.ac.in', password: 'Admin@123' });
    mnnitAdminToken = mnnitAdminLogin.body.token;

    // Obtain MNNIT student token
    const mnnitStudentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student1@mnnit.ac.in', password: 'Student@123' });
    mnnitStudentToken = mnnitStudentLogin.body.token;
  });

  describe('1. Health and Baseline Verification', () => {
    it('GET /api/health should return status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.name).toBe('NyayaSetu API');
    });
  });

  describe('2. Authentication and Role-Based Access Control (RBAC)', () => {
    it('POST /api/auth/login should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@mnnit.ac.in', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('POST /api/auth/login should allow seeded MNNIT student1 to authenticate', async () => {
      expect(mnnitStudentToken).toBeDefined();
    });

    it('POST /api/auth/login should allow seeded MNNIT admin to authenticate', async () => {
      expect(mnnitAdminToken).toBeDefined();
    });

    it('GET /api/admin/dashboard should deny access to student with 403', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${mnnitStudentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('GET /api/admin/dashboard should grant access to MNNIT admin with 200', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${mnnitAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalComplaints).toBeGreaterThan(0);
      expect(res.body.byStatus).toBeDefined();
    });

    it('GET /api/admin/officers should return real admin officers for admin', async () => {
      const res = await request(app)
        .get('/api/admin/officers')
        .set('Authorization', `Bearer ${mnnitAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.officers)).toBe(true);
      expect(res.body.officers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Strict @mnnit.ac.in Email Domain Validation', () => {
    it('should reject non-mnnit.ac.in domains (gmail.com, mnnit.edu.in, subdomains)', async () => {
      const invalidEmails = [
        'student@gmail.com',
        'student@mnnit.edu.in',
        'student@mnnit.ac.in.example.com',
        'student@cs.mnnit.ac.in',
        'student@subdomain.mnnit.ac.in',
        'bad..syntax@mnnit.ac.in',
        '@mnnit.ac.in',
      ];

      for (const email of invalidEmails) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            name: 'Invalid Test User',
            password: 'Password@123',
          });
        expect(res.status).toBe(400);
        const errMessage = res.body.error || res.body.details?.[0]?.message || '';
        expect(errMessage.length).toBeGreaterThan(0);
      }
    });

    it('should reject authority access requests with non-mnnit.ac.in email', async () => {
      const res = await request(app)
        .post('/api/auth/authority-request')
        .send({
          name: 'Prof. External',
          email: 'external.prof@gmail.com',
          password: 'Password@123',
          department: 'Hostel',
          designation: 'Warden',
          employee_id: 'W-102',
          justification: 'Need access to resolve hostel issues.',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('@mnnit.ac.in');
    });

    it('should normalize email with whitespace trimming and lowercase conversion', async () => {
      const testEmail = `  tRiM.tEsT.${Date.now()}@mnnit.ac.in  `;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          name: 'Case Normalization Student',
          password: 'Password@123',
        });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testEmail.trim().toLowerCase());
    });
  });

  describe('4. Secure Email OTP Verification Workflow', () => {
    const studentEmail = `student.otp.${Date.now()}@mnnit.ac.in`;

    it('Step 1: POST /api/auth/register should send OTP and not issue JWT yet', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: studentEmail,
          name: 'Pooja Verma',
          password: 'PoojaPassword@123',
          department: 'Computer Science and Engineering',
        });
      expect(res.status).toBe(200);
      expect(res.body.verificationType).toBe('student_registration');
      expect(res.body.token).toBeUndefined(); // Never issue JWT before verification
      expect(res.body.otp).toBeUndefined(); // Never expose OTP in API payload

      // Verify OTP was passed to mailer
      expect(sentOtps[studentEmail]).toBeDefined();
      expect(sentOtps[studentEmail].length).toBe(6);
    });

    it('Unverified user cannot log in before entering OTP (fails with 401 or 403)', async () => {
      const loginAttempt = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentEmail,
          password: 'PoojaPassword@123',
          expectedRole: 'student',
        });
      // User is either not in users table yet or is_verified = 0
      expect([401, 403]).toContain(loginAttempt.status);
    });

    it('Step 2: POST /api/auth/verify-otp with wrong OTP should reject and decrement attempts', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: studentEmail,
          otp: '000000',
          verificationType: 'student_registration',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid verification code');
    });

    it('Step 3: POST /api/auth/verify-otp with correct OTP should activate student account', async () => {
      const correctOtp = sentOtps[studentEmail];
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: studentEmail,
          otp: correctOtp,
          verificationType: 'student_registration',
        });
      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);

      // Verify that the user can now sign in successfully
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentEmail,
          password: 'PoojaPassword@123',
          expectedRole: 'student',
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.user.email).toBe(studentEmail);
    });

    it('Step 4: Reusing an already verified OTP must fail with 400', async () => {
      const reusedOtp = sentOtps[studentEmail];
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: studentEmail,
          otp: reusedOtp,
          verificationType: 'student_registration',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('5. Authority Request OTP & Approval Workflow', () => {
    const authorityEmail = `faculty.lead.${Date.now()}@mnnit.ac.in`;

    it('Initiates authority access request with @mnnit.ac.in email', async () => {
      const res = await request(app)
        .post('/api/auth/authority-request')
        .send({
          name: 'Prof. Neeraj Mishra',
          email: authorityEmail,
          password: 'AuthorityPassword@123',
          department: 'Civil Engineering',
          designation: 'Hostel Warden',
          employee_id: 'FAC-8812',
          justification: 'Designated warden handling SVBH hostel maintenance grievances.',
        });
      expect(res.status).toBe(200);
      expect(res.body.verificationType).toBe('authority_request');
      expect(sentOtps[authorityEmail]).toBeDefined();
    });

    it('Verifies authority email with OTP into pending review queue', async () => {
      const correctOtp = sentOtps[authorityEmail];
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: authorityEmail,
          otp: correctOtp,
          verificationType: 'authority_request',
        });
      expect(res.status).toBe(200);
      expect(res.body.pendingApproval).toBe(true);

      // Unapproved authority user cannot login yet
      const loginAttempt = await request(app)
        .post('/api/auth/login')
        .send({
          email: authorityEmail,
          password: 'AuthorityPassword@123',
          expectedRole: 'admin',
        });
      expect(loginAttempt.status).toBe(401);
    });

    it('Admin can list verified requests and approve account', async () => {
      const listRes = await request(app)
        .get('/api/admin/authority-requests')
        .set('Authorization', `Bearer ${mnnitAdminToken}`);
      expect(listRes.status).toBe(200);
      const reqItem = listRes.body.requests.find((r: any) => r.email === authorityEmail);
      expect(reqItem).toBeDefined();

      // Approve the request
      const approveRes = await request(app)
        .put(`/api/admin/authority-requests/${reqItem.id}/approve`)
        .set('Authorization', `Bearer ${mnnitAdminToken}`);
      expect(approveRes.status).toBe(200);

      // Verify newly approved authority can now log into authority portal
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: authorityEmail,
          password: 'AuthorityPassword@123',
          expectedRole: 'admin',
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('admin');
    });
  });

  describe('6. Grievance Management, Audit Trails, and Public Stats', () => {
    it('POST /api/complaints creates a complaint and genesis hash', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${mnnitStudentToken}`)
        .field('title', 'Hostel Canteen Filtered Water Chiller Issue')
        .field('category', 'hostel')
        .field('priority', 'medium')
        .field('description', 'The water chiller unit in SVBH Canteen requires regular filter replacement.');
      expect(res.status).toBe(201);
      expect(res.body.complaint.id).toBeDefined();
      createdComplaintId = res.body.complaint.id;
    });

    it('GET /api/complaints/:id/verify-audit verifies cryptographic hash chain', async () => {
      const res = await request(app)
        .get(`/api/complaints/${createdComplaintId}/verify-audit`)
        .set('Authorization', `Bearer ${mnnitStudentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.verification.valid).toBe(true);
    });

    it('GET /api/public/stats returns real aggregate database statistics with zero PII', async () => {
      const res = await request(app).get('/api/public/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalComplaints).toBeGreaterThanOrEqual(12);
      expect(typeof res.body.resolutionRate).toBe('number');
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('@mnnit.ac.in');
    });
  });

  describe('7. Local Development Mode vs Production Security', () => {
    const originalEnv = process.env.NODE_ENV;

    it('GET /api/auth/delivery-status returns delivery metadata for frontend', async () => {
      const res = await request(app).get('/api/auth/delivery-status');
      expect(res.status).toBe(200);
      expect(res.body.deliveryMode).toBeDefined();
      expect(typeof res.body.isDevelopment).toBe('boolean');
    });

    it('Local development mode activates when SMTP is unconfigured outside production', async () => {
      // Temporarily restore sendOTPEmail mock so actual implementation executes
      sendOTPSpy.mockRestore();
      getMailerStatusSpy.mockReturnValue({
        configured: false,
        reason: 'SMTP configuration is incomplete.',
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await mailer.sendOTPEmail('dev.student@mnnit.ac.in', '654321', 'Student Registration');
      expect(result.delivered).toBe(true);
      expect(result.mode).toBe('development');
      expect(result.devNotice).toContain('Local Development Mode');

      // Verify that OTP was logged to console terminal
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[NYAYASETU LOCAL DEV MODE]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('654321'));

      consoleSpy.mockRestore();
    });

    it('Production mode strictly fails securely with 503 when SMTP is unconfigured', async () => {
      // Set NODE_ENV to production and unconfigure SMTP
      process.env.NODE_ENV = 'production';
      getMailerStatusSpy.mockReturnValue({
        configured: false,
        reason: 'SMTP configuration is incomplete. Please specify SMTP_HOST, SMTP_USER, and SMTP_PASS.',
      });

      // Attempting to send OTP directly in production without SMTP must throw
      await expect(
        mailer.sendOTPEmail('prod.test@mnnit.ac.in', '999999', 'Student Registration')
      ).rejects.toThrow(/SMTP.*required in production/i);

      // Attempting registration via API in production without SMTP must return 503
      const prodEmail = `prod.fail.${Date.now()}@mnnit.ac.in`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: prodEmail,
          name: 'Prod Test User',
          password: 'Password@123',
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBeDefined();

      // Ensure no challenge was recorded in database
      const challenge = db.prepare('SELECT id FROM email_verifications WHERE email = ?').get(prodEmail);
      expect(challenge).toBeUndefined();

      // Restore environment and re-enable spies
      process.env.NODE_ENV = originalEnv;
      getMailerStatusSpy.mockReturnValue({ configured: true });
      sendOTPSpy = vi.spyOn(mailer, 'sendOTPEmail').mockImplementation(async (email: string, otp: string) => {
        sentOtps[email] = otp;
        return { delivered: true, mode: 'smtp' };
      });
    });
  });
});
