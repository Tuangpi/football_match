import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

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

    // Prevent an admin from deactivating themselves
    if (id === req.user.id && !user.isActive) {
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