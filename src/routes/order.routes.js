import express from 'express';
import { pool } from '../db/index.js';
import {
  createOrderController,
  createOrderWithUploadController,
  getUserOrdersController,
  getAllOrdersController,
  updateOrderStatusController,
  getOrderTrackingController,
  uploadComprobanteController,
  getOrderByIdController,
  updatePedidoFields,
  updateOrderItemsController,
  getSignedComprobanteUrlController
} from '../controllers/order.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadComprobante } from '../middlewares/upload.middleware.js';
import { canViewOrder, canModifyOrder } from '../middlewares/orderAccess.middleware.js';

import { deleteOrder } from '../models/order.model.js';

const router = express.Router();

// ✅ Todas las rutas requieren login
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Endpoints de gestión de pedidos
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear un nuevo pedido
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               empresa_id:
 *                 type: integer
 *               total:
 *                 type: number
 *     responses:
 *       201:
 *         description: Pedido creado
 */


// ✅ Crear pedido
router.post('/', authorizeRoles('usuario', 'empresa'), createOrderController);

// ✅ Crear con comprobante
/**
 * @swagger
 * /api/orders/with-comprobante:
 *   post:
 *     summary: Crear pedido con carga de comprobante
 *     tags: [Orders]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               comprobante:
 *                 type: string
 *                 format: binary
 *               orderData:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pedido creado con comprobante
 */
router.post('/with-comprobante', authorizeRoles('usuario', 'empresa'), uploadComprobante.single('comprobante'), createOrderWithUploadController);

// ✅ Obtener pedidos del usuario logueado
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Obtener pedidos del usuario
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Lista de pedidos del usuario
 */
router.get('/', authorizeRoles('usuario', 'empresa'), getUserOrdersController);

// ✅ Obtener todos los pedidos (admin/moderador)
/**
 * @swagger
 * /api/orders/all:
 *   get:
 *     summary: Obtener todos los pedidos (Admin/Moderador)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Lista de todos los pedidos
 */
router.get('/all', authorizeRoles('admin', 'moderador'), getAllOrdersController);

// ✅ Ver un pedido
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener pedido por ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles del pedido
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/:id', canViewOrder, getOrderByIdController);

// ✅ Ver historial de un pedido
/**
 * @swagger
 * /api/orders/{id}/history:
 *   get:
 *     summary: Obtener historial del pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial del pedido
 */
router.get('/:id/history', canViewOrder, getOrderTrackingController);

// ✅ Ver si es editable
/**
 * @swagger
 * /api/orders/{id}/editable:
 *   get:
 *     summary: Verificar si el pedido es editable
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado de editabilidad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 editable:
 *                   type: boolean
 */
router.get('/:id/editable', canViewOrder, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT editable_hasta FROM orders WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ editable: false });

    const ahora = new Date();
    const editable = ahora < new Date(result.rows[0].editable_hasta);
    res.json({ editable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ editable: false });
  }
});

// ✅ Subir comprobante (solo si puede ver)
/**
 * @swagger
 * /api/orders/{id}/comprobante:
 *   post:
 *     summary: Subir comprobante para el pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               comprobante:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Comprobante subido
 */
router.post('/:id/comprobante', canViewOrder, uploadComprobante.single('comprobante'), uploadComprobanteController);

// ✅ Actualizar ítems del pedido (solo dueño mientras esté en tiempo o admin)
/**
 * @swagger
 * /api/orders/{id}/update-items:
 *   put:
 *     summary: Actualizar ítems o estado del pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pedido actualizado
 */
router.put('/:id/update-items', canModifyOrder, updateOrderItemsController);

// ✅ Actualizar solo estado del pedido (solo admin)
router.put('/:id/update-items', canModifyOrder, updateOrderStatusController);

// ✅ Agregar nota admin
/**
 * @swagger
 * /api/orders/{id}/nota:
 *   put:
 *     summary: Agregar nota de admin al pedido
 *     tags: [Orders]
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
 *             required:
 *               - nota_admin
 *             properties:
 *               nota_admin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nota actualizada
 */
router.put('/:id/nota', authorizeRoles('admin', 'moderador'), async (req, res) => {
  const { id } = req.params;
  const { nota_admin } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET nota_admin = $1 WHERE id = $2 RETURNING *', [nota_admin, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ message: 'Nota actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Eliminar pedido (solo admin)
/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Eliminar un pedido
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pedido eliminado
 */
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json({ message: 'Pedido eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar' });
  }
});

export default router;
