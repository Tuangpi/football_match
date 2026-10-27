import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { me, sync, logout } from '../controllers/auth';

const router = Router();

router.get('/me', authenticate, me);
router.post('/sync', authenticate, sync);
router.post('/logout', authenticate, logout);

export default router;
