import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

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

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().nullable().optional(),
});

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const data = updateReviewSchema.parse(req.body);

    if (data.rating === undefined && data.comment === undefined) {
      return next(new AppError('Provide rating and/or comment to update', 400));
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new AppError('Review not found', 404));
    }
    if (review.userId !== req.user.id) {
      return next(new AppError('Not authorized to update this review', 403));
    }

    const updated = await prisma.review.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true } } },
    });

    res.json({ success: true, review: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return next(new AppError('Review not found', 404));
    }
    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to delete this review', 403));
    }

    await prisma.review.delete({ where: { id } });
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
};