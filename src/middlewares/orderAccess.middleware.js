// src/middlewares/orderAccess.middleware.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { pool } from '../db/index.js';
import { getPedidoConItemsById } from '../models/order.model.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ✅ Middleware: verificar si el usuario puede ver el pedido
 */
export const canViewOrder = async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const orderId = req.params.id;

  try {
    const result = await pool.query('SELECT user_id FROM orders WHERE id = $1', [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedidoUserId = result.rows[0].user_id;

    if (['admin', 'moderador'].includes(userRole) || pedidoUserId === userId) {
      return next();
    }

    return res.status(403).json({ error: 'No tenés permiso para ver este pedido' });
  } catch (err) {
    console.error('❌ Error en canViewOrder:', err);
    return res.status(500).json({ error: 'Error interno al verificar permiso' });
  }
};

/**
 * ✅ Middleware: verificar si puede modificar (editar/cancelar) el pedido
 */
export const canModifyOrder = async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const orderId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT user_id, editable_hasta FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedidoUserId = result.rows[0].user_id;
    const editableHasta = result.rows[0].editable_hasta;
    const ahora = dayjs().tz('America/Argentina/Buenos_Aires');

    // ✅ Admin / moderador pueden editar siempre
    if (['admin', 'moderador'].includes(userRole)) return next();

    // ✅ Debe ser dueño del pedido
    if (pedidoUserId !== userId) {
      return res.status(403).json({ error: 'No podés editar un pedido que no es tuyo' });
    }

    // ✅ Y todavía dentro del tiempo permitido
    if (!editableHasta || ahora.isAfter(dayjs(editableHasta))) {
      return res.status(403).json({ error: 'Este pedido ya no se puede editar' });
    }

    return next();
  } catch (err) {
    console.error('❌ Error en canModifyOrder:', err);
    return res.status(500).json({ error: 'Error interno al verificar permiso' });
  }
};
