import express from 'express';
import {
  getMyProfile,
  createMyProfile,
  updateMyProfile
} from '../controllers/userProfile.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Proteger todas las rutas
router.use(verifyToken);

router.get('/me', getMyProfile);
router.post('/me', createMyProfile);
router.put('/me', updateMyProfile);

export default router;
