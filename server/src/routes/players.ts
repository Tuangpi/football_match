import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
  sendFriendRequest,
  getMyFriends,
  getPendingRequests,
  respondToFriendRequest,
} from '../controllers/players';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/me', validate(z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  skillLevel: z.string().optional(),
  bio: z.string().optional(),
})), updateMyProfile);
router.get('/:id', getPublicProfile);

// Friend routes
router.post('/friends/request', validate(z.object({ receiverId: z.string() })), sendFriendRequest);
router.get('/friends', getMyFriends);
router.get('/friends/pending', getPendingRequests);
router.put('/friends/:id/respond', validate(z.object({ accept: z.boolean() })), respondToFriendRequest);

export default router;