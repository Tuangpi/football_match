import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

export const listUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { ownedCourts: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

export const listCourts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courts = await prisma.court.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        sportType: true,
        basePricePerHour: true,
        isActive: true,
        createdAt: true,
        owner: { select: { id: true, email: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, courts });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [users, courts, bookings, events, activeCourts, pendingBookings] =
      await Promise.all([
        prisma.user.count(),
        prisma.court.count(),
        prisma.booking.count(),
        prisma.event.count(),
        prisma.court.count({ where: { isActive: true } }),
        prisma.booking.count({ where: { status: 'PENDING' } }),
      ]);

    const recentBookings = await prisma.booking.findMany({
      select: {
        id: true,
        status: true,
        totalPrice: true,
        bookedAt: true,
        player: { select: { email: true } },
        court: { select: { name: true, city: true } },
      },
      orderBy: { bookedAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      stats: {
        users,
        courts,
        bookings,
        events,
        activeCourts,
        pendingBookings,
        recentBookings,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const toggleCourtActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    const updated = await prisma.court.update({
      where: { id },
      data: { isActive: !court.isActive },
    });

    res.json({
      success: true,
      court: updated,
      message: `Court ${updated.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent an admin from deactivating themselves (reactivating self is the recovery path)
    if (id === req.user.id && user.isActive) {
      return next(new AppError('Cannot deactivate yourself', 400));
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({
      success: true,
      user: { id: updated.id, email: updated.email, role: updated.role, isActive: updated.isActive },
      message: `User ${updated.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (err) {
    next(err);
  }
};