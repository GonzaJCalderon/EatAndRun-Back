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



// ============================================
// RUTAS PARA MENÚ ESPECIAL POR FECHA
// ============================================

// GET /api/menu/especial/fecha/:fecha - Obtener menú especial de una fecha específica
router.get('/especial/fecha/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params; // formato: YYYY-MM-DD
    
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    const { rows } = await pool.query(`
      SELECT id, name, description, fecha_especifica, disponible
      FROM menu_especial
      WHERE fecha_especifica = $1 AND disponible = true
      ORDER BY name ASC
    `, [fecha]);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener menú especial por fecha:', error);
    res.status(500).json({ error: 'Error al obtener menú especial' });
  }
});

// GET /api/menu/especial - Obtener todos los menús especiales (admin)
router.get('/especial', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, description, fecha_especifica, disponible, created_at
      FROM menu_especial
      WHERE disponible = true
      ORDER BY fecha_especifica DESC, name ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener menús especiales:', error);
    res.status(500).json({ error: 'Error al obtener menús especiales' });
  }
});

// POST /api/menu/especial - Crear menú especial (admin)
router.post('/especial', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, fecha_especifica } = req.body;

    if (!name || !fecha_especifica) {
      return res.status(400).json({ error: 'Nombre y fecha son obligatorios' });
    }

    const { rows } = await pool.query(`
      INSERT INTO menu_especial (name, description, fecha_especifica, disponible)
      VALUES ($1, $2, $3, true)
      RETURNING *
    `, [name, description || '', fecha_especifica]);

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error al crear menú especial:', error);
    res.status(500).json({ error: 'Error al crear menú especial' });
  }
});

// PUT /api/menu/especial/:id - Actualizar menú especial (admin)
router.put('/especial/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, fecha_especifica, disponible } = req.body;

    const campos = [];
    const valores = [];
    let contador = 1;

    if (name !== undefined) {
      campos.push(`name = $${contador++}`);
      valores.push(name);
    }
    if (description !== undefined) {
      campos.push(`description = $${contador++}`);
      valores.push(description);
    }
    if (fecha_especifica !== undefined) {
      campos.push(`fecha_especifica = $${contador++}`);
      valores.push(fecha_especifica);
    }
    if (disponible !== undefined) {
      campos.push(`disponible = $${contador++}`);
      valores.push(disponible);
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    valores.push(id);
    const query = `UPDATE menu_especial SET ${campos.join(', ')} WHERE id = $${contador} RETURNING *`;
    const { rows } = await pool.query(query, valores);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menú especial no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error al actualizar menú especial:', error);
    res.status(500).json({ error: 'Error al actualizar menú especial' });
  }
});

// DELETE /api/menu/especial/:id - Deshabilitar menú especial (admin)
router.delete('/especial/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      UPDATE menu_especial SET disponible = false WHERE id = $1 RETURNING *
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menú especial no encontrado' });
    }

    res.json({ message: 'Menú especial deshabilitado' });
  } catch (error) {
    console.error('Error al eliminar menú especial:', error);
    res.status(500).json({ error: 'Error al eliminar menú especial' });
  }
});

// GET /api/menu/fixed - Obtener menú fijo (para todos)
router.get('/fixed', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, description, disponible
      FROM menu_fixed
      WHERE disponible = true
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener menú fijo:', error);
    res.status(500).json({ error: 'Error al obtener menú fijo' });
  }
});
export default router;
