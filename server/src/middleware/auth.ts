import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { AuthenticatedRequest, JwtPayload, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'nyayasetu-dev-secret-change-in-production';

/**
 * Authentication middleware.
 * Verifies the JWT token from the Authorization header (Bearer scheme),
 * looks up the user in the database, and attaches user info to the request.
 * Rejects requests with missing, invalid, or expired tokens.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Token is missing.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Look up the user to ensure they still exist and get current data
    const user = db.prepare(
      'SELECT id, email, name, role, department FROM users WHERE id = ?'
    ).get(decoded.userId) as Omit<User, 'password_hash' | 'created_at'> | undefined;

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token has expired. Please login again.' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token. Please login again.' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

/**
 * Authorization middleware factory.
 * Returns middleware that checks if the authenticated user has one of the
 * allowed roles. Must be used after the authenticate middleware.
 *
 * @param roles - One or more roles that are allowed access
 * @returns Express middleware that enforces role-based access control
 *
 * @example
 * router.get('/admin-only', authenticate, authorize('admin'), handler);
 * router.get('/any-user', authenticate, authorize('student', 'admin'), handler);
 */
export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      return;
    }

    next();
  };
}

export { JWT_SECRET };
