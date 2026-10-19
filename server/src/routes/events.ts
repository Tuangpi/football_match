import { Router } from 'express';
import {
  getEvents,
  getEvent,
  getOwnerEvents,
  getOwnerEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/events';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

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
router.get('/', getEvents);
router.get('/:id', getEvent);

// Owner
router.use(authenticate);
router.get('/owner/me', authorize('OWNER'), getOwnerEvents);
router.get('/owner/me/:id', authorize('OWNER'), getOwnerEvent);
router.post('/', authorize('OWNER'), validate(createEventSchema), createEvent);
router.put('/:id', authorize('OWNER'), validate(updateEventSchema), updateEvent);
router.delete('/:id', authorize('OWNER'), deleteEvent);

export default router;