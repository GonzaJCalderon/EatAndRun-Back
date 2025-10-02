import express from 'express';
import { pool } from '../db/index.js'; // ⬅️ AGREGAR
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

router.use(verifyToken);

router.put('/:id/update-items', updateOrderItemsController);
router.put('/:id/nota', authorizeRoles('admin', 'moderador'), async (req, res) => {
  const { id } = req.params;
  const { nota_admin } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE orders SET nota_admin = $1 WHERE id = $2 RETURNING *',
      [nota_admin, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.json({ message: 'Nota actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar nota:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/comprobante/url', getSignedComprobanteUrlController);
router.post('/', authorizeRoles('usuario', 'empresa'), createOrderController);
router.post('/with-comprobante', authorizeRoles('usuario', 'empresa'), uploadComprobante.single('comprobante'), createOrderWithUploadController);
router.get('/', authorizeRoles('usuario', 'empresa'), getUserOrdersController);
router.get('/all', authorizeRoles('admin', 'moderador', 'usuario'), getAllOrdersController);
router.post('/:id/comprobante', canViewOrder, uploadComprobante.single('comprobante'), uploadComprobanteController);
router.put('/:id', canModifyOrder, updateOrderStatusController);
router.get('/:id', canViewOrder, getOrderByIdController);
router.get('/:id/history', canViewOrder, getOrderTrackingController);
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await deleteOrder(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    res.status(200).json({ message: 'Pedido eliminado exitosamente' });
  } catch (err) {
    console.error('❌ Error al eliminar pedido:', err);
    res.status(500).json({ message: 'Error del servidor al eliminar el pedido' });
  }
});

export default router;