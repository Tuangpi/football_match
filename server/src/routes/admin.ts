import { Router } from 'express';
import { listUsers, listCourts, getStats, toggleCourtActive, toggleUserActive } from '../controllers/admin';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/users', listUsers);
router.get('/courts', listCourts);
router.get('/stats', getStats);
router.patch('/courts/:id/toggle', toggleCourtActive);
router.patch('/users/:id/toggle', toggleUserActive);

export default router;