import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middleware/error";
import { prisma } from "../utils/prisma";

import { createBookingSchema, validateRange, validateOpeningHours } from "../utils/bookingTime";

const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

// Player
export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { courtId, startsAt, endsAt, teamId } = createBookingSchema.parse(req.body);
    const range = validateRange(startsAt, endsAt);
    if (teamId) {
      const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: req.user.id } },
      });
      if (!member) throw new AppError("You are not a member of this team", 403);
    }
    const playerId = req.user.id;
    const booking = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${courtId} FOR UPDATE`;
      const court = await tx.court.findUnique({ where: { id: courtId } });
      if (!court) throw new AppError("Court not found", 404);
      if (!court.isActive) throw new AppError("Court is not available", 400);
      validateOpeningHours(court.openingHours, range.startsAt, range.endsAt);
      const overlap = { courtId, startsAt: { lt: range.endsAt }, endsAt: { gt: range.startsAt } };
      if (
        (await tx.booking.findFirst({
          where: { ...overlap, status: { in: ["PENDING", "CONFIRMED"] } },
        })) ||
        (await tx.courtBlock.findFirst({ where: overlap }))
      ) {
        throw new AppError("Requested time is no longer available", 409);
      }
      return tx.booking.create({
        data: {
          courtId,
          ...range,
          playerId,
          teamId,
          totalPrice:
            court.basePricePerHour *
            ((range.endsAt.getTime() - range.startsAt.getTime()) / 3_600_000),
        },
        include: { court: { select: { id: true, name: true, city: true } }, team: true },
      });
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
};

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const bookings = await prisma.booking.findMany({
      where: { playerId: req.user.id },
      include: {
        court: { select: { id: true, name: true, city: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { bookedAt: "desc" },
    });

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { id } = req.params;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    if (booking.playerId !== req.user.id) {
      return next(new AppError("Not authorized to cancel this booking", 403));
    }

    if (booking.status === "CANCELLED") {
      return next(new AppError("Booking already cancelled", 400));
    }

    // Players may only withdraw requests the owner has not confirmed yet.
    if (booking.status !== "PENDING") {
      return next(
        new AppError("Confirmed bookings can only be cancelled by the court owner", 400),
      );
    }

    const updated = await prisma.booking.updateMany({
      where: { id, playerId: req.user.id, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (!updated.count) {
      return next(new AppError("Booking can no longer be cancelled", 409));
    }
    const result = await prisma.booking.findUnique({ where: { id } });

    res.json({ success: true, booking: result });
  } catch (err) {
    next(err);
  }
};

// Owner
export const getOwnerBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const bookings = await prisma.booking.findMany({
      where: {
        court: { ownerId: req.user.id },
      },
      include: {
        court: { select: { id: true, name: true } },
        player: { select: { id: true, email: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { bookedAt: "desc" },
    });

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { id } = req.params;
    const { status } = updateBookingStatusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    });
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    if (booking.court.ownerId !== req.user.id && req.user.role !== "ADMIN") {
      return next(new AppError("Not authorized to update this booking", 403));
    }

    if (booking.status === "CANCELLED" && status !== "CANCELLED") {
      throw new AppError("Cancelled bookings cannot be reopened; create a new booking", 400);
    }
    const updated = await prisma.booking.updateMany({
      where: { id, status: { not: "CANCELLED" } },
      data: { status, cancelledAt: status === "CANCELLED" ? new Date() : null },
    });
    if (!updated.count) throw new AppError("Booking is already cancelled", 409);
    const result = await prisma.booking.findUnique({
      where: { id },
      include: { court: true, player: { select: { id: true, email: true } } },
    });
    res.json({ success: true, booking: result });
  } catch (err) {
    next(err);
  }
};
