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

router.use(verifyToken); // ✅ Todas las rutas requieren login

// ✅ Crear pedido
router.post('/', authorizeRoles('usuario', 'empresa'), createOrderController);

// ✅ Crear con comprobante
router.post('/with-comprobante', authorizeRoles('usuario', 'empresa'), uploadComprobante.single('comprobante'), createOrderWithUploadController);

// ✅ Obtener pedidos del usuario logueado
router.get('/', authorizeRoles('usuario', 'empresa'), getUserOrdersController);

// ✅ Obtener todos los pedidos (admin/moderador)
router.get('/all', authorizeRoles('admin', 'moderador'), getAllOrdersController);

// ✅ Ver un pedido
router.get('/:id', canViewOrder, getOrderByIdController);

// ✅ Ver historial de un pedido
router.get('/:id/history', canViewOrder, getOrderTrackingController);

// ✅ Ver si es editable
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
router.post('/:id/comprobante', canViewOrder, uploadComprobante.single('comprobante'), uploadComprobanteController);

// ✅ Actualizar ítems del pedido (solo dueño mientras esté en tiempo o admin)
router.put('/:id/update-items', canModifyOrder, updateOrderItemsController);

// ✅ Actualizar solo estado del pedido (solo admin)
router.put('/:id/update-items', canModifyOrder, updateOrderStatusController);

// ✅ Agregar nota admin
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
