import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getOwnerBookings,
  updateBookingStatus,
} from "../controllers/bookings";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";

import { createBookingSchema } from "../utils/bookingTime";

const router = Router();

const updateBookingStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
});

router.use(authenticate);

router.post("/", validate(createBookingSchema), createBooking);
router.get("/me", getMyBookings);
router.patch("/:id/cancel", cancelBooking);

// Owner booking management
router.get("/owner", authorize("OWNER"), getOwnerBookings);
router.patch(
  "/owner/:id/status",
  authorize("OWNER"),
  validate(updateBookingStatusSchema),
  updateBookingStatus,
);

export default router;
