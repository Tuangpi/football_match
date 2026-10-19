import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

const createEventSchema = z
  .object({
    courtId: z.string(),
    title: z.string().min(1),
    type: z.enum(['TOURNAMENT', 'COMPETITION', 'DISCOUNT', 'PRICE_CHANGE']),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

const updateEventSchema = z
  .object({
    title: z.string().min(1).optional(),
    type: z.enum(['TOURNAMENT', 'COMPETITION', 'DISCOUNT', 'PRICE_CHANGE']).optional(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate) > new Date(data.startDate),
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );

// Public
export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courtId, type, city, when } = req.query;

    const where: any = {};
    if (courtId) where.courtId = String(courtId);
    if (type) where.type = type;
    if (city) where.court = { city: { contains: String(city), mode: 'insensitive' } };

    // "Upcoming" keeps events that have not ended yet; "past" is the opposite.
    let orderBy: { startDate: 'asc' | 'desc' } = { startDate: 'asc' };
    const now = new Date();
    if (when === 'upcoming') {
      where.endDate = { gte: now };
    } else if (when === 'past') {
      where.endDate = { lt: now };
      orderBy = { startDate: 'desc' };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        court: { select: { id: true, name: true, city: true } },
      },
      orderBy,
    });

    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
};

// Public
export const getEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            sportType: true,
            basePricePerHour: true,
          },
        },
      },
    });

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// Management reads are scoped to court ownership, not the event's creator.
export const getOwnerEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const events = await prisma.event.findMany({
      where: req.user.role === 'ADMIN' ? {} : { court: { ownerId: req.user.id } },
      include: { court: { select: { id: true, name: true, city: true } } },
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
};

export const getOwnerEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Authentication required', 401));
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        ...(req.user.role === 'ADMIN' ? {} : { court: { ownerId: req.user.id } }),
      },
      include: { court: { select: { id: true, name: true, city: true } } },
    });
    if (!event) return next(new AppError('Event not found', 404));
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// Owner
export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { courtId, ...data } = createEventSchema.parse(req.body);

    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    if (court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to create events for this court', 403));
    }

    const event = await prisma.event.create({
      data: { ...data, courtId, userId: req.user.id },
      include: { court: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const data = updateEventSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id }, include: { court: true } });
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (event.court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to update this event', 403));
    }

    const startDate = data.startDate ? new Date(data.startDate) : event.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : event.endDate;
    if (endDate <= startDate) {
      return next(new AppError('endDate must be after startDate', 400));
    }

    const updated = await prisma.event.update({ where: { id }, data });
    res.json({ success: true, event: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id }, include: { court: true } });
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (event.court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to delete this event', 403));
    }

    await prisma.event.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};