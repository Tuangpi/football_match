import { Router } from 'express';
import { toggleCourtActive, toggleUserActive } from '../controllers/admin';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.patch('/courts/:id/toggle', toggleCourtActive);
router.patch('/users/:id/toggle', toggleUserActive);

export default router;