import express from 'express';
import { createKitchenOrderController } from '../controllers/kitchenOrder.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Kitchen
 *   description: Gestión de cocina
 */

// Crear pedido de cocina
/**
 * @swagger
 * /api/kitchen/orders:
 *   post:
 *     summary: Crear pedido de cocina
 *     tags: [Kitchen]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido de cocina creado
 */
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin', 'empresa', 'usuario'),
  createKitchenOrderController
);

export default router;
