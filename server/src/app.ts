import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';

dotenv.config();

import { errorHandler, notFound } from './middleware/error';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import teamRoutes from './routes/teams';
import courtRoutes from './routes/courts';
import bookingRoutes from './routes/bookings';
import eventRoutes from './routes/events';
import reviewRoutes from './routes/reviews';
import adminRoutes from './routes/admin';
import { restrictAdminToDashboard } from './middleware/auth';
import { prisma } from './utils/prisma';
import * as Sentry from '@sentry/node';
import { isSentryEnabled } from './observability';

const app = express();
const isTest = process.env.NODE_ENV === 'test';

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(clerkMiddleware());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests. Please try again later.' },
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'football-match-server' });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'football-match-server', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', service: 'football-match-server', database: 'unavailable' });
  }
});

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', restrictAdminToDashboard);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reviews', reviewRoutes);

// 404
app.use(notFound);

if (isSentryEnabled) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use(errorHandler);

export default app;
