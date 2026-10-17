import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/events';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createEventSchema = z.object({
  courtId: z.string(),
  title: z.string().min(1),
  type: z.enum(['TOURNAMENT', 'COMPETITION', 'DISCOUNT', 'PRICE_CHANGE']),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['TOURNAMENT', 'COMPETITION', 'DISCOUNT', 'PRICE_CHANGE']).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Public
router.get('/', getEvents);

// Owner
router.use(authenticate);
router.post('/', authorize('OWNER', 'ADMIN'), validate(createEventSchema), createEvent);
router.put('/:id', authorize('OWNER', 'ADMIN'), validate(updateEventSchema), updateEvent);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteEvent);

export default router;