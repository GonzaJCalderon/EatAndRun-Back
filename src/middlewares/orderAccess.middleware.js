import { pool } from '../db/index.js';


// 🔐 Solo permite modificar si el pedido aún tiene días futuros
import dayjs from 'dayjs';
import { getPedidoConItemsById } from '../models/order.model.js';

export const canEditOrder = async (req, res, next) => {
  const { id } = req.params;
  const pedido = await getPedidoConItemsById(id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  const hoy = dayjs().tz('America/Argentina/Buenos_Aires').startOf('day');
  const fechas = Object.values(pedido.pedido?.fecha_dia_por_dia || {});
  const editable = fechas.some((fechaStr) => {
    const fecha = dayjs(fechaStr).tz('America/Argentina/Buenos_Aires').startOf('day');
    return hoy.isBefore(fecha); // día aún no llegó
  });

  if (!editable) {
    return res.status(403).json({ error: 'Este pedido ya no se puede editar' });
  }

  next();
};


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
    console.error('❌ Error en verificación de permiso de pedido:', err);
    return res.status(500).json({ error: 'Error interno al verificar el permiso' });
  }
};

export const canModifyOrder = async (req, res, next) => {
  const userRole = req.user.role;

  if (['admin', 'moderador'].includes(userRole)) {
    return next();
  }

  return res.status(403).json({ error: 'No tenés permiso para modificar este pedido' });
};
