import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']).default('FUTSAL'),
});

export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { name, sportType } = createTeamSchema.parse(req.body);

    const team = await prisma.team.create({
      data: {
        name,
        sportType,
        captainId: req.user.id,
        members: {
          create: { userId: req.user.id, role: 'CAPTAIN' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, email: true, playerProfile: true } } } },
        captain: { select: { id: true, email: true } },
      },
    });

    res.status(201).json({ success: true, team });
  } catch (err) {
    next(err);
  }
};

export const getTeams = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sportType } = req.query;

    const teams = await prisma.team.findMany({
      where: sportType ? { sportType: sportType as any } : undefined,
      include: {
        captain: { select: { id: true, email: true } },
        members: { include: { user: { select: { id: true, email: true } } } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, teams });
  } catch (err) {
    next(err);
  }
};

export const getTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        captain: { select: { id: true, email: true, playerProfile: true } },
        members: { include: { user: { select: { id: true, email: true, playerProfile: true } } } },
        bookings: {
          orderBy: { bookedAt: 'desc' },
          take: 10,
          include: { court: { select: { id: true, name: true, city: true } } },
        },
      },
    });

    if (!team) {
      return next(new AppError('Team not found', 404));
    }

    res.json({ success: true, team });
  } catch (err) {
    next(err);
  }
};

export const joinTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return next(new AppError('Team not found', 404));
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: req.user.id } },
    });

    if (existing) {
      return next(new AppError('Already a member of this team', 400));
    }

    const member = await prisma.teamMember.create({
      data: { teamId: id, userId: req.user.id, role: 'MEMBER' },
      include: { user: { select: { id: true, email: true } } },
    });

    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
};

export const leaveTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return next(new AppError('Team not found', 404));
    }

    if (team.captainId === req.user.id) {
      return next(new AppError('Captain cannot leave the team. Transfer captaincy first.', 400));
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId: id, userId: req.user.id } },
    });

    res.json({ success: true, message: 'Left the team' });
  } catch (err) {
    next(err);
  }
};