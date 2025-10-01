import express from 'express';
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
import { uploadComprobante } from '../middlewares/upload.middleware.js'; // ✅
import { canViewOrder, canModifyOrder } from '../middlewares/orderAccess.middleware.js';
import { deleteOrder } from '../models/order.model.js';




const router = express.Router();

router.use(verifyToken);

router.post('/', authorizeRoles('usuario', 'empresa'), createOrderController);

router.post(
  '/with-comprobante',
  authorizeRoles('usuario', 'empresa'),
  uploadComprobante.single('comprobante'), // ✅ corregido
  createOrderWithUploadController
);

router.get('/', authorizeRoles('usuario', 'empresa'), getUserOrdersController);
router.get('/all', authorizeRoles('admin', 'moderador', 'usuario'), getAllOrdersController);
// Solo admins y moderadores pueden modificar
router.put('/:id', canModifyOrder, updateOrderStatusController);

// Para ver pedido individual (próximo paso si agregás GET /:id)
router.get('/:id', canViewOrder, getOrderByIdController);

// Ver historial de estados: se puede si sos dueño o admin
router.get('/:id/history', canViewOrder, getOrderTrackingController);

// Subida de comprobante: solo si sos dueño del pedido
router.post('/:id/comprobante', canViewOrder, uploadComprobante.single('comprobante'), uploadComprobanteController);

// 🚮 Eliminar pedido (solo admins)
router.delete('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await deleteOrder(id); // 🔥 Acá se llama directamente a la función del modelo

    if (!deleted) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.status(200).json({ message: 'Pedido eliminado exitosamente' });
  } catch (err) {
    console.error('❌ Error al eliminar pedido:', err);
    res.status(500).json({ message: 'Error del servidor al eliminar el pedido' });
  }
});

// ✅ Primero las rutas específicas
router.get('/comprobante/url', getSignedComprobanteUrlController);

// Luego las rutas con parámetros dinámicos
router.get('/:id', canViewOrder, getOrderByIdController);
router.get('/:id/history', canViewOrder, getOrderTrackingController);
router.post('/:id/comprobante', canViewOrder, uploadComprobante.single('comprobante'), uploadComprobanteController);




export default router;
