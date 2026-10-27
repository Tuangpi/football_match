import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'football-match-server' });
});

// API routes
app.use('/api/auth', authRoutes);
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

// Global error handler
app.use(errorHandler);

export default app;
