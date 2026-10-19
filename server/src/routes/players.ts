import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
  searchUsers,
  sendFriendRequest,
  getMyFriends,
  getPendingRequests,
  respondToFriendRequest,
} from '../controllers/players';
import { authenticate, authorize } from '../middleware/auth';
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
  avatarUrl: z.string().url('Must be a valid URL').nullable().optional(),
})), updateMyProfile);

// User search + friend routes MUST come before /:id,
// otherwise GET /friends is captured by /:id and 404s
router.get('/search', authorize('PLAYER'), searchUsers);
router.post('/friends/request', authorize('PLAYER'), validate(z.object({ receiverId: z.string() })), sendFriendRequest);
router.get('/friends', authorize('PLAYER'), getMyFriends);
router.get('/friends/pending', authorize('PLAYER'), getPendingRequests);
router.put('/friends/:id/respond', authorize('PLAYER'), validate(z.object({ accept: z.boolean() })), respondToFriendRequest);

router.get('/:id', getPublicProfile);

export default router;