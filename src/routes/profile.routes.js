import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// Ruta abierta a todos los autenticados
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Ruta protegida alcanzada',
    user: req.user
  });
});

// Ruta solo para admins
router.get('/admin-only', verifyToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Bienvenido admin' });
});

// Ruta para usuario o empresa
router.get('/menu-access', verifyToken, authorizeRoles('usuario', 'empresa'), (req, res) => {
  res.json({ message: 'Acceso permitido a menú del día' });
});

export default router;
