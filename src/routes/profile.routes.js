import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Perfil y verificaciones de acceso
 */

// Ruta abierta a todos los autenticados
/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Verificar acceso al perfil
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Acceso concedido
 */
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    message: 'Ruta protegida alcanzada',
    user: req.user
  });
});

// Ruta solo para admins
/**
 * @swagger
 * /api/admin-only:
 *   get:
 *     summary: Verificación de acceso admin
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Bienvenido admin
 */
router.get('/admin-only', verifyToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Bienvenido admin' });
});

// Ruta para usuario o empresa
/**
 * @swagger
 * /api/menu-access:
 *   get:
 *     summary: Verificar acceso al menú
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: Acceso concedido
 */
router.get('/menu-access', verifyToken, authorizeRoles('usuario', 'empresa'), (req, res) => {
  res.json({ message: 'Acceso permitido a menú del día' });
});

export default router;
