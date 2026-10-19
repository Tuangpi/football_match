import { Router } from "express";
import {
  getCourts,
  getCourt,
  createCourt,
  updateCourt,
  deleteCourt,
  getOwnerCourts,
  createCourtSlot,
  getCourtSlots,
  deleteCourtSlot,
} from "../controllers/courts";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { openingHoursSchema } from "../utils/bookingTime";
import {
  getAvailability,
  getBlocks,
  createBlock,
  deleteBlock,
  blockSchema,
} from "../controllers/availability";

const router = Router();

const createCourtSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  sportType: z.enum(["FUTSAL", "ELEVEN_A_SIDE"]).optional(),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.number().positive(),
  openingHours: openingHoursSchema.optional(),
});

const updateCourtSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  sportType: z.enum(["FUTSAL", "ELEVEN_A_SIDE"]).optional(),
  dimensions: z.string().optional(),
  surfaceType: z.string().optional(),
  basePricePerHour: z.number().positive().optional(),
  openingHours: openingHoursSchema.optional(),
  isActive: z.boolean().optional(),
});

const createCourtSlotSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string(),
  endTime: z.string(),
  pricePerHour: z.number().positive().optional(),
});

// Public
router.get("/", getCourts);
router.get("/:id", getCourt);
router.get("/:id/slots", getCourtSlots);
router.get("/:id/availability", getAvailability);

// Owner
router.use(authenticate);
router.get("/owner/me", getOwnerCourts);
router.post("/", authorize("OWNER", "ADMIN"), validate(createCourtSchema), createCourt);
router.put("/:id", authorize("OWNER", "ADMIN"), validate(updateCourtSchema), updateCourt);
router.delete("/:id", authorize("OWNER", "ADMIN"), deleteCourt);
router.post(
  "/:id/slots",
  authorize("OWNER", "ADMIN"),
  validate(createCourtSlotSchema),
  createCourtSlot,
);
router.delete("/:id/slots/:slotId", authorize("OWNER", "ADMIN"), deleteCourtSlot);
router.get("/:id/blocks", authorize("OWNER", "ADMIN"), getBlocks);
router.post("/:id/blocks", authorize("OWNER", "ADMIN"), validate(blockSchema), createBlock);
router.delete("/:id/blocks/:blockId", authorize("OWNER", "ADMIN"), deleteBlock);

export default router;
