import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaints';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Security Middleware ────────────────────────────────────────────────────

/** Helmet sets various HTTP headers for security */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/** CORS - allow requests from the frontend URL */
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/** Rate limiter - 100 requests per 15 minutes per IP */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

/** Parse JSON request bodies (limit 10mb for file metadata) */
app.use(express.json({ limit: '10mb' }));

/** Parse URL-encoded bodies */
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ───────────────────────────────────────────────────────────

/** Serve uploaded files statically */
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

/** Health check endpoint */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'NyayaSetu API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

/**
 * Global error handler middleware.
 * Catches unhandled errors and returns a consistent JSON error response.
 * In development, includes the error message; in production, returns a generic message.
 */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Handle multer errors (file upload)
  if (err.message && err.message.includes('File type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message === 'File too large') {
    res.status(400).json({ error: 'File size exceeds the 5MB limit.' });
    return;
  }

  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
});

/** 404 handler for unknown routes */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Start Server ───────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 NyayaSetu API server running on http://localhost:${PORT}`);
    console.log(`📁 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🔒 Rate limit: 100 requests per 15 minutes\n`);
  });
}

export default app;
