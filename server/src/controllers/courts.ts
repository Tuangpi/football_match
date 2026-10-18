import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';

const createCourtSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']).default('FUTSAL'),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.number().positive(),
});

const updateCourtSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']).optional(),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

// Public
export const getCourts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { city, sportType, minPrice, maxPrice } = req.query;

    const where: any = { isActive: true };

    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (sportType) where.sportType = sportType;
    if (minPrice || maxPrice) {
      where.basePricePerHour = {};
      if (minPrice) where.basePricePerHour.gte = parseFloat(String(minPrice));
      if (maxPrice) where.basePricePerHour.lte = parseFloat(String(maxPrice));
    }

    const courts = await prisma.court.findMany({
      where,
      include: {
        owner: { select: { id: true, email: true } },
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, courts });
  } catch (err) {
    next(err);
  }
};

export const getCourt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const court = await prisma.court.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        slots: {
          where: { date: { gte: new Date() } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        reviews: {
          include: { user: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    res.json({ success: true, court });
  } catch (err) {
    next(err);
  }
};

// Owner routes
export const createCourt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const data = createCourtSchema.parse(req.body);

    const court = await prisma.court.create({
      data: { ...data, ownerId: req.user.id },
    });

    res.status(201).json({ success: true, court });
  } catch (err) {
    next(err);
  }
};

export const updateCourt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const data = updateCourtSchema.parse(req.body);

    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    if (court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to update this court', 403));
    }

    const updated = await prisma.court.update({ where: { id }, data });
    res.json({ success: true, court: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCourt = async (
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

    if (court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to delete this court', 403));
    }

    await prisma.court.delete({ where: { id } });
    res.json({ success: true, message: 'Court deleted' });
  } catch (err) {
    next(err);
  }
};

export const getOwnerCourts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const courts = await prisma.court.findMany({
      where: { ownerId: req.user.id },
      include: {
        slots: { take: 5, orderBy: { createdAt: 'desc' } },
        bookings: { take: 5, orderBy: { bookedAt: 'desc' } },
      },
    });

    res.json({ success: true, courts });
  } catch (err) {
    next(err);
  }
};

const createCourtSlotSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string(),
  endTime: z.string(),
  pricePerHour: z.number().positive().optional(),
});

export const createCourtSlot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const data = createCourtSlotSchema.parse(req.body);

    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }

    if (court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to add slots to this court', 403));
    }

    const slot = await prisma.courtSlot.create({
      data: {
        courtId: id,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        pricePerHour: data.pricePerHour ?? court.basePricePerHour,
      },
    });

    res.status(201).json({ success: true, slot });
  } catch (err) {
    next(err);
  }
};

// Delete a slot owned by the caller's court.
// Booking.courtSlot FK has no cascade, so active bookings block deletion;
// cancelled bookings are removed with the slot in one transaction.
export const deleteCourtSlot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id, slotId } = req.params;

    const court = await prisma.court.findUnique({ where: { id } });
    if (!court) {
      return next(new AppError('Court not found', 404));
    }
    if (court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to delete slots on this court', 403));
    }

    const slot = await prisma.courtSlot.findUnique({
      where: { id: slotId },
      include: { bookings: { select: { id: true, status: true } } },
    });
    if (!slot || slot.courtId !== id) {
      return next(new AppError('Slot not found', 404));
    }

    const active = slot.bookings.filter((b) => b.status !== 'CANCELLED');
    if (active.length > 0) {
      return next(new AppError('Cannot delete a slot with active bookings', 400));
    }

    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { courtSlotId: slotId } }),
      prisma.courtSlot.delete({ where: { id: slotId } }),
    ]);

    res.json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    next(err);
  }
};

export const getCourtSlots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const where: any = { courtId: id };
    if (date) {
      const d = new Date(String(date));
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const slots = await prisma.courtSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ success: true, slots });
  } catch (err) {
    next(err);
  }
};