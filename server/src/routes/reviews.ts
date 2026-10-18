import { Router } from 'express';
import { getCourtReviews, createReview, updateReview, deleteReview } from '../controllers/reviews';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createReviewSchema = z.object({
  courtId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().nullable().optional(),
});

router.get('/:courtId', getCourtReviews);
router.use(authenticate);
router.post('/', validate(createReviewSchema), createReview);
router.patch('/:id', validate(updateReviewSchema), updateReview);
router.delete('/:id', deleteReview);

export default router;