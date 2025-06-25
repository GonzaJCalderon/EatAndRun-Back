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

// 🔐 Admin puede asignar pedidos
router.put('/orders/:id/assign', verifyToken, authorizeRoles('admin'), assignDelivery);

// 🚚 Delivery: pedidos propios y disponibles
router.get('/delivery/my-orders', verifyToken, authorizeRoles('delivery'), getMyDeliveries);
router.get('/delivery/unassigned-orders', verifyToken, authorizeRoles('admin', 'delivery'), getUnassignedOrders);

// ✅ Reclamar pedido
router.put('/delivery/orders/:id/claim', verifyToken, authorizeRoles('delivery'), selfAssignOrder);

// ✅ Marcar como entregado (ruta específica)
router.put('/delivery/orders/:id/deliver', verifyToken, authorizeRoles('delivery'), markAsDelivered);

// ✅ Actualizar estado dinámicamente ("en camino", "entregado", etc.)
router.put('/orders/:id/status', verifyToken, authorizeRoles('delivery'), updateDeliveryOrderStatus);

// 🛠 Admin: ver todos los pedidos
router.get('/admin/orders', verifyToken, authorizeRoles('admin'), getAllOrders);

// 📜 Historial de entregas del repartidor
router.get('/delivery/history', verifyToken, authorizeRoles('delivery'), getDeliveryHistory);

router.get('/deliveries/search', verifyToken, authorizeRoles('admin'), buscarDeliveries);



export default router;
