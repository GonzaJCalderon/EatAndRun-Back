import express from 'express';
import { createKitchenOrderController } from '../controllers/kitchenOrder.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// Crear pedido de cocina
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin', 'empresa', 'usuario'),
  createKitchenOrderController
);

export default router;
