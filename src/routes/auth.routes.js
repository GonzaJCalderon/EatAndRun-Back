// ✅ src/routes/auth.routes.js
import express from 'express';
import {
  registerController,
  loginController,
  forgotPassword,
  resetPassword,
  changePassword,
  verificarCodigoEmpresa
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';

// Limitador de peticiones para rutas de autenticación sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Límite de 10 peticiones por IP por ventana
  message: { error: 'Demasiados intentos desde esta IP, por favor intente nuevamente en 15 minutos.' }
});

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [usuario, empresa, delivery, admin, moderador, empleado]
 *               telefono:
 *                 type: string
 *               direccion_principal:
 *                 type: string
 *               direccion_alternativa:
 *                 type: string
 *               codigoInvitacion:
 *                 type: string
 *               empresa:
 *                 type: object
 *                 properties:
 *                   razonSocial:
 *                     type: string
 *                   cuit:
 *                     type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error de validación
 *       409:
 *         description: Email ya registrado
 *       500:
 *         description: Error del servidor
 */

// 👇 Esta es la que te falta
router.get('/ping', (req, res) => {
  res.json({ message: 'pong 🏓 API funcionando' });
});

router.post('/register', authLimiter, registerController);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authLimiter, loginController);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email de recuperación enviado
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 */
router.post('/reset-password', authLimiter, resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Cambiar contraseña (autenticado)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente
 */
router.post('/change-password', verifyToken, changePassword);

/**
 * @swagger
 * /api/auth/verificar-codigo:
 *   post:
 *     summary: Verificar código de empresa
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Código válido
 */
router.post('/verificar-codigo', verificarCodigoEmpresa);


export default router;
