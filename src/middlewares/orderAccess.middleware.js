import { pool } from '../db/index.js';

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

    if ([99, 4].includes(userRole) || pedidoUserId === userId) {
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

  // Solo admins y moderadores (99, 4) pueden modificar
  if ([99, 4].includes(userRole)) {
    return next();
  }

  return res.status(403).json({ error: 'No tenés permiso para modificar este pedido' });
};
