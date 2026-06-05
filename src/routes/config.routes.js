import express from 'express';
import { getPreciosController, setPreciosController } from '../controllers/config.controller.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 🛡️ Protección
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Config
 *   description: Configuración del sistema
 */

// Obtener los precios actuales
/**
 * @swagger
 * /api/config/precios:
 *   get:
 *     summary: Obtener los precios actuales
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Precios actuales
 */
router.get('/precios', getPreciosController);

// Actualizar los precios (solo admin o moderador)
/**
 * @swagger
 * /api/config/precios:
 *   put:
 *     summary: Actualizar precios
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               precio_menu:
 *                 type: number
 *               precio_delivery:
 *                 type: number
 *     responses:
 *       200:
 *         description: Precios actualizados
 */
router.put('/precios', authorizeRoles('admin', 'moderador'), setPreciosController);

export default router;
