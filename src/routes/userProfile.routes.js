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

/**
 * @swagger
 * tags:
 *   name: UserProfile
 *   description: Gestión de perfil de usuario
 */

/**
 * @swagger
 * /api/perfil/me:
 *   get:
 *     summary: Obtener mi perfil
 *     tags: [UserProfile]
 *     responses:
 *       200:
 *         description: Datos de mi perfil
 *   post:
 *     summary: Crear mi perfil
 *     tags: [UserProfile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               direccion_principal:
 *                 type: string
 *     responses:
 *       201:
 *         description: Perfil creado
 *   put:
 *     summary: Actualizar mi perfil
 *     tags: [UserProfile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               direccion_principal:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
router.get('/me', getMyProfile);
router.post('/me', createMyProfile);
router.put('/me', updateMyProfile);

export default router;
