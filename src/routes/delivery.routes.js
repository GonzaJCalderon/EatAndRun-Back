import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import {
  assignDelivery,
  getMyDeliveries,
  markAsDelivered,
  getUnassignedOrders,
  selfAssignOrder,
  getAllOrders,
  updateDeliveryOrderStatus,
  getDeliveryHistory,
  buscarDeliveries 
} from '../controllers/delivery.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Gestión de repartos
 */

// 🔐 Admin puede asignar pedidos
/**
 * @swagger
 * /api/orders/{id}/assign:
 *   put:
 *     summary: Asignar repartidor al pedido
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               delivery_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Asignado
 */
router.put('/orders/:id/assign', verifyToken, authorizeRoles('admin'), assignDelivery);

// 🚚 Delivery: pedidos propios y disponibles
/**
 * @swagger
 * /api/delivery/my-orders:
 *   get:
 *     summary: Obtener mis pedidos asignados
 *     tags: [Delivery]
 *     responses:
 *       200:
 *         description: Mis pedidos
 */
router.get('/delivery/my-orders', verifyToken, authorizeRoles('delivery'), getMyDeliveries);

/**
 * @swagger
 * /api/delivery/unassigned-orders:
 *   get:
 *     summary: Obtener pedidos no asignados
 *     tags: [Delivery]
 *     responses:
 *       200:
 *         description: Pedidos no asignados
 */
router.get('/delivery/unassigned-orders', verifyToken, authorizeRoles('admin', 'delivery'), getUnassignedOrders);

// ✅ Reclamar pedido
/**
 * @swagger
 * /api/delivery/orders/{id}/claim:
 *   put:
 *     summary: Reclamar un pedido
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pedido reclamado
 */
router.put('/delivery/orders/:id/claim', verifyToken, authorizeRoles('delivery'), selfAssignOrder);

// ✅ Marcar como entregado (ruta específica)
/**
 * @swagger
 * /api/delivery/orders/{id}/deliver:
 *   put:
 *     summary: Marcar pedido como entregado
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entregado
 */
router.put('/delivery/orders/:id/deliver', verifyToken, authorizeRoles('delivery'), markAsDelivered);

// ✅ Actualizar estado dinámicamente ("en camino", "entregado", etc.)
/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Actualizar estado del reparto
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.put('/orders/:id/status', verifyToken, authorizeRoles('delivery'), updateDeliveryOrderStatus);

// 🛠 Admin: ver todos los pedidos
router.get('/admin/orders', verifyToken, authorizeRoles('admin'), getAllOrders);

// 📜 Historial de entregas del repartidor
/**
 * @swagger
 * /api/delivery/history:
 *   get:
 *     summary: Obtener historial de entregas
 *     tags: [Delivery]
 *     responses:
 *       200:
 *         description: Historial
 */
router.get('/delivery/history', verifyToken, authorizeRoles('delivery'), getDeliveryHistory);

router.get('/deliveries/search', verifyToken, authorizeRoles('admin'), buscarDeliveries);



export default router;
