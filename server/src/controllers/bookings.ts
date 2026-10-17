import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';

const createBookingSchema = z.object({
  courtSlotId: z.string(),
  teamId: z.string().optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
});

// Player
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { courtSlotId, teamId } = createBookingSchema.parse(req.body);

    const slot = await prisma.courtSlot.findUnique({
      where: { id: courtSlotId },
      include: { court: true },
    });

    if (!slot) {
      return next(new AppError('Court slot not found', 404));
    }

    if (!slot.isAvailable) {
      return next(new AppError('Slot is not available', 400));
    }

    if (teamId) {
      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: req.user.id } },
      });
      if (!member) {
        return next(new AppError('You are not a member of this team', 403));
      }
    }

    const existing = await prisma.booking.findFirst({
      where: { courtSlotId, status: { in: ['PENDING', 'CONFIRMED'] } },
    });
    if (existing) {
      return next(new AppError('Slot already booked', 400));
    }

    const totalPrice = slot.pricePerHour || 0;

    const booking = await prisma.booking.create({
      data: {
        courtId: slot.courtId,
        courtSlotId,
        playerId: req.user.id,
        teamId,
        status: 'PENDING',
        totalPrice,
      },
      include: {
        court: { select: { id: true, name: true, city: true } },
        courtSlot: true,
        team: true,
      },
    });

    await prisma.courtSlot.update({
      where: { id: courtSlotId },
      data: { isAvailable: false },
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const bookings = await prisma.booking.findMany({
      where: { playerId: req.user.id },
      include: {
        court: { select: { id: true, name: true, city: true } },
        courtSlot: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { bookedAt: 'desc' },
    });

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.playerId !== req.user.id) {
      return next(new AppError('Not authorized to cancel this booking', 403));
    }

    if (booking.status === 'CANCELLED') {
      return next(new AppError('Booking already cancelled', 400));
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await prisma.courtSlot.update({
      where: { id: booking.courtSlotId },
      data: { isAvailable: true },
    });

    res.json({ success: true, booking: updated });
  } catch (err) {
    next(err);
  }
};

// Owner
export const getOwnerBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const bookings = await prisma.booking.findMany({
      where: {
        court: { ownerId: req.user.id },
      },
      include: {
        court: { select: { id: true, name: true } },
        courtSlot: true,
        player: { select: { id: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { bookedAt: 'desc' },
    });

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const { status } = updateBookingStatusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    });
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.court.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError('Not authorized to update this booking', 403));
    }

    const previousStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        court: { select: { id: true, name: true } },
        courtSlot: true,
        player: { select: { id: true, email: true } },
      },
    });

    if (
      status === 'CANCELLED' &&
      (previousStatus === 'PENDING' || previousStatus === 'CONFIRMED')
    ) {
      await prisma.courtSlot.update({
        where: { id: booking.courtSlotId },
        data: { isAvailable: true },
      });
    }

    res.json({ success: true, booking: updated });
  } catch (err) {
    next(err);
  }
};