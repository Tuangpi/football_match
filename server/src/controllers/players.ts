import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  skillLevel: z.string().optional(),
  bio: z.string().optional(),
});

export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const data = updateProfileSchema.parse(req.body);

    const profile = await prisma.playerProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    });

    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

export const getPublicProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: id },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!profile) {
      return next(new AppError('Player not found', 404));
    }

    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};

// Friend routes
export const sendFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { receiverId } = z.object({ receiverId: z.string() }).parse(req.body);

    if (receiverId === req.user.id) {
      return next(new AppError('Cannot send friend request to yourself', 400));
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return next(new AppError('User not found', 404));
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });

    if (existing) {
      return next(new AppError('Friend request already exists', 400));
    }

    const friend = await prisma.friend.create({
      data: { senderId: req.user.id, receiverId, status: 'PENDING' },
    });

    res.status(201).json({ success: true, friend });
  } catch (err) {
    next(err);
  }
};

export const getMyFriends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ senderId: req.user.id }, { receiverId: req.user.id }],
        status: 'ACCEPTED',
      },
      include: {
        sender: { select: { id: true, email: true, playerProfile: true } },
        receiver: { select: { id: true, email: true, playerProfile: true } },
      },
    });

    res.json({ success: true, friends });
  } catch (err) {
    next(err);
  }
};

export const getPendingRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const requests = await prisma.friend.findMany({
      where: { receiverId: req.user.id, status: 'PENDING' },
      include: {
        sender: { select: { id: true, email: true, playerProfile: true } },
      },
    });

    res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

export const respondToFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const { accept } = z.object({ accept: z.boolean() }).parse(req.body);

    const request = await prisma.friend.findUnique({ where: { id } });
    if (!request) {
      return next(new AppError('Friend request not found', 404));
    }

    if (request.receiverId !== req.user.id) {
      return next(new AppError('Not authorized to respond to this request', 403));
    }

    const updated = await prisma.friend.update({
      where: { id },
      data: { status: accept ? 'ACCEPTED' : 'BLOCKED' },
      include: {
        sender: { select: { id: true, email: true, playerProfile: true } },
        receiver: { select: { id: true, email: true, playerProfile: true } },
      },
    });

    res.json({ success: true, friend: updated });
  } catch (err) {
    next(err);
  }
};