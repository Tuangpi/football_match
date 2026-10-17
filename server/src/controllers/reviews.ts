import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const createReviewSchema = z.object({
  courtId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const getCourtReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courtId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { courtId },
      include: { user: { select: { id: true, email: true, playerProfile: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { courtId, rating, comment } = createReviewSchema.parse(req.body);

    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    const existing = await prisma.review.findUnique({
      where: { courtId_userId: { courtId, userId: req.user.id } },
    });
    if (existing) {
      return next(new AppError('You have already reviewed this court', 400));
    }

    const review = await prisma.review.create({
      data: { courtId, userId: req.user.id, rating, comment },
      include: { user: { select: { id: true, email: true } } },
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
};