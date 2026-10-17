import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeam,
  joinTeam,
  leaveTeam,
} from '../controllers/teams';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1),
  sportType: z.enum(['FUTSAL', 'ELEVEN_A_SIDE']).optional(),
});

router.use(authenticate);

router.post('/', validate(createTeamSchema), createTeam);
router.get('/', getTeams);
router.get('/:id', getTeam);
router.post('/:id/join', joinTeam);
router.delete('/:id/leave', leaveTeam);

export default router;