import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

const syncSchema = z.object({
  role: z.enum(['PLAYER', 'OWNER']).optional(),
});

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        playerProfile: true,
        ownedCourts: { select: { id: true, name: true, city: true } },
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

export const sync = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { role } = syncSchema.parse(req.body ?? {});

    // Only allow setting role on first sync (user just created). Do not let
    // callers escalate privileges on an existing account.
    const existing = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!existing) {
      return next(new AppError('User not found', 404));
    }

    const updates: { role?: any } = {};
    const createdRecently =
      Date.now() - new Date(existing.createdAt).getTime() < 60_000;
    if (role && createdRecently && existing.role === 'PLAYER' && role === 'OWNER') {
      updates.role = 'OWNER';
    }

    const user = Object.keys(updates).length
      ? await prisma.user.update({ where: { id: existing.id }, data: updates, select: { id: true, email: true, role: true } })
      : { id: existing.id, email: existing.email, role: existing.role };

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  res.json({ success: true, message: 'Logged out' });
};

