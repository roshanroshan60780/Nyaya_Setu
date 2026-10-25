import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { verifyAuditChain } from '../utils/audit';
import db from '../db/database';

describe('NyayaSetu Backend API Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let createdComplaintId: number;

  beforeAll(async () => {
    // Obtain admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nyayasetu.edu.in', password: 'Admin@123' });
    adminToken = adminLogin.body.token;

    // Obtain student token
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul.sharma@student.edu.in', password: 'Student@123' });
    studentToken = studentLogin.body.token;
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
        .send({ email: 'admin@nyayasetu.edu.in', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('POST /api/auth/register should create a new student account', async () => {
      const uniqueEmail = `test.student.${Date.now()}@student.edu.in`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Ananya Deshmukh',
          password: 'Password@123',
          department: 'Civil Engineering',
        });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('student');
      expect(res.body.token).toBeDefined();
    });

    it('GET /api/admin/dashboard should deny access to student with 403', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('GET /api/admin/dashboard should grant access to admin with 200', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalComplaints).toBeGreaterThan(0);
      expect(res.body.byStatus).toBeDefined();
    });
  });

  describe('3. Grievance Management and Validation', () => {
    it('POST /api/complaints should validate short titles (fails with 400)', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Bad')
        .field('category', 'academic')
        .field('priority', 'medium')
        .field('description', 'This is a description that is long enough to pass description check.');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/complaints should create a valid complaint and log audit genesis', async () => {
      const res = await request(app)
        .post('/api/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .field('title', 'Library Wi-Fi Connectivity Dead Zone')
        .field('category', 'infrastructure')
        .field('priority', 'high')
        .field('description', 'Wi-Fi signal completely drops out in Reading Hall 3 for the past 4 days.');
      expect(res.status).toBe(201);
      expect(res.body.complaint.id).toBeDefined();
      createdComplaintId = res.body.complaint.id;
    });

    it('GET /api/complaints/:id should return complaint details', async () => {
      const res = await request(app)
        .get(`/api/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.complaint.title).toBe('Library Wi-Fi Connectivity Dead Zone');
    });

    it('POST /api/complaints/:id/comments should allow discussion updates', async () => {
      const res = await request(app)
        .post(`/api/complaints/${createdComplaintId}/comments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ content: 'Network team, please check the router AP-3 on the 2nd floor.' });
      expect(res.status).toBe(201);
      expect(res.body.comment.content).toContain('Network team');
    });
  });

  describe('4. Advanced Features: Tamper-Evident Hash Chain & Escalation', () => {
    it('GET /api/complaints/:id/verify-audit should verify intact hash chain', async () => {
      const res = await request(app)
        .get(`/api/complaints/${createdComplaintId}/verify-audit`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.verification.valid).toBe(true);
      expect(res.body.verification.entries).toBeGreaterThanOrEqual(2); // genesis + comment
    });

    it('POST /api/admin/check-escalations should trigger overdue scan', async () => {
      const res = await request(app)
        .post('/api/admin/check-escalations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.escalatedCount).toBe('number');
    });

    it('GET /api/admin/analytics should deliver anonymized statistics without PII', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.categoryDistribution).toBeDefined();
      expect(res.body.resolutionRates).toBeDefined();
      // Ensure no raw email or student names are leaked
      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toContain('rahul.sharma@student.edu.in');
      expect(bodyString).not.toContain('priya.patel@student.edu.in');
    });
  });
});
