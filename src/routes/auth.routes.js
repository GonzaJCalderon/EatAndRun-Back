// ✅ src/routes/auth.routes.js
import express from 'express';
import {
  registerController,
  loginController,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 👇 Esta es la que te falta
router.get('/ping', (req, res) => {
  res.json({ message: 'pong 🏓 API funcionando' });
});

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', verifyToken, changePassword);

export default router;
