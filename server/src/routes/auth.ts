import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db/database';
import { authenticate, JWT_SECRET } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AuthenticatedRequest, User } from '../types';

const router = Router();

/** Zod schema for user registration */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().optional(),
});

/** Zod schema for login */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register
 * Register a new student user.
 * Admin accounts can only be created via the seed script.
 */
router.post('/register', validate(registerSchema), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { email, name, password, department } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    // Hash password with bcrypt (salt rounds = 12)
    const passwordHash = bcrypt.hashSync(password, 12);

    // Only student role allowed via registration; admin accounts created via seed
    const result = db.prepare(
      `INSERT INTO users (email, name, password_hash, role, department)
       VALUES (?, ?, ?, 'student', ?)`
    ).run(email, name, passwordHash, department || null);

    const userId = result.lastInsertRowid as number;

    // Generate JWT
    const token = jwt.sign(
      { userId, email, role: 'student' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email,
        name,
        role: 'student',
        department: department || null,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password, returning a JWT token.
 */
router.post('/login', validate(loginSchema), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { email, password } = req.body;

    // Look up user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

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
      'SELECT id, email, name, role, department, created_at FROM users WHERE id = ?'
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
