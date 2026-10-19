import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/error";
import { timeRangeSchema, validateRange } from "../utils/bookingTime";
import { z } from "zod";

export const blockSchema = timeRangeSchema.extend({ reason: z.string().trim().min(1).max(200) });

export async function getAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(req.query.date);
    if (!date.success) throw new AppError("Provide a date as YYYY-MM-DD", 400);
    const start = new Date(`${date.data}T00:00:00+06:30`);
    if (
      !Number.isFinite(start.getTime()) ||
      new Date(start.getTime() + 390 * 60_000).toISOString().slice(0, 10) !== date.data
    ) {
      throw new AppError("Invalid calendar date", 400);
    }
    const end = new Date(start.getTime() + 86_400_000);
    const court = await prisma.court.findUnique({ where: { id: req.params.id } });
    if (!court) throw new AppError("Court not found", 404);
    const where = { courtId: court.id, startsAt: { lt: end }, endsAt: { gt: start } };
    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({
        where: { ...where, status: { in: ["PENDING", "CONFIRMED"] } },
        select: { startsAt: true, endsAt: true },
      }),
      prisma.courtBlock.findMany({ where, select: { startsAt: true, endsAt: true } }),
    ]);
    // Public availability intentionally excludes identities, prices, block IDs and private reasons.
    res.json({
      success: true,
      openingHours: court.openingHours,
      isActive: court.isActive,
      busy: [...bookings, ...blocks],
    });
  } catch (err) {
    next(err);
  }
}

export async function getBlocks(req: Request, res: Response, next: NextFunction) {
  try {
    const court = await prisma.court.findUnique({ where: { id: req.params.id } });
    if (!court) throw new AppError("Court not found", 404);
    if (court.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      throw new AppError("Not authorized", 403);
    const blocks = await prisma.courtBlock.findMany({
      where: { courtId: court.id, endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    res.json({ success: true, blocks });
  } catch (err) {
    next(err);
  }
}

export async function createBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const data = blockSchema.parse(req.body);
    const range = validateRange(data.startsAt, data.endsAt);
    const courtId = req.params.id;
    const block = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${courtId} FOR UPDATE`;
      const court = await tx.court.findUnique({ where: { id: courtId } });
      if (!court) throw new AppError("Court not found", 404);
      if (court.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
        throw new AppError("Not authorized", 403);
      const overlap = { courtId, startsAt: { lt: range.endsAt }, endsAt: { gt: range.startsAt } };
      if (
        (await tx.booking.findFirst({
          where: { ...overlap, status: { in: ["PENDING", "CONFIRMED"] } },
        })) ||
        (await tx.courtBlock.findFirst({ where: overlap }))
      ) {
        throw new AppError("Time overlaps an active booking or blocked period", 409);
      }
      return tx.courtBlock.create({ data: { courtId, ...range, reason: data.reason } });
    });
    res.status(201).json({ success: true, block });
  } catch (err) {
    next(err);
  }
}

export async function deleteBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const court = await prisma.court.findUnique({ where: { id: req.params.id } });
    if (!court) throw new AppError("Court not found", 404);
    if (court.ownerId !== req.user!.id && req.user!.role !== "ADMIN")
      throw new AppError("Not authorized", 403);
    const result = await prisma.courtBlock.deleteMany({
      where: { id: req.params.blockId, courtId: court.id },
    });
    if (!result.count) throw new AppError("Blocked period not found", 404);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
