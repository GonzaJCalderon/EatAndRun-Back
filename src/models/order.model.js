import { pool } from '../db/index.js';
import { agruparItemsPorTipo, parsePedido } from '../utils/order.utils.js';

export const createOrder = async (userId, items, total, {
  fechaEntrega,
  observaciones,
  metodoPago,
  tipoMenu,
  comprobanteUrl = null
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderInsert = await client.query(`
      INSERT INTO orders (user_id, total, fecha_entrega, observaciones, metodo_pago, tipo_menu, comprobante_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [userId, total, fechaEntrega, observaciones, metodoPago, tipoMenu, comprobanteUrl]);

    const orderId = orderInsert.rows[0].id;

    for (const item of items) {
      const { item_type, item_id, quantity, dia, precio } = item;

      if (!['daily', 'fijo', 'extra', 'tarta', 'skip'].includes(item_type)) {
        console.warn(`⚠️ Tipo de ítem no soportado: ${item_type}`);
        continue;
      }

      let finalItemId = null;
      let finalItemName = null;

      if (item_type === 'tarta' || item_type === 'skip') {
        finalItemName = String(item_id);
      }

      if (['daily', 'fijo', 'extra'].includes(item_type)) {
        finalItemId = parseInt(item_id);
        const tabla =
          item_type === 'daily' ? 'daily_menu' :
          item_type === 'fijo' ? 'fixed_menu' :
          item_type === 'extra' ? 'menu_extras' : null;

        if (tabla && !isNaN(finalItemId)) {
          const resNombre = await client.query(`SELECT name FROM ${tabla} WHERE id = $1`, [finalItemId]);
          finalItemName = resNombre.rows[0]?.name || `ID:${finalItemId}`;
        }
      }

      await client.query(`
        INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orderId, item_type, finalItemId, finalItemName, quantity, dia || null, precio || null]);
    }

    await client.query('COMMIT');
    return { id: orderId, message: 'Pedido creado correctamente' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear la orden en DB:', err);
    throw err;
  } finally {
    client.release();
  }
};

export const getOrdersByUser = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

export const getAllOrders = async () => {
  const result = await pool.query(`
    SELECT 
      o.id, o.fecha_entrega, o.status AS estado, o.observaciones,
      o.comprobante_url, o.comprobante_nombre, o.metodo_pago, o.tipo_menu,
      o.delivery_name, o.delivery_phone,
      u.name AS nombre, u.last_name AS apellido, u.email,
      up.telefono, up.direccion_principal, up.direccion_secundaria,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name',
          CASE 
            WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN (SELECT name FROM menu_daily WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN (SELECT name FROM menu_fixed WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN (SELECT name FROM menu_extras WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
            ELSE oi.item_id
          END,
        'quantity', oi.quantity,
        'dia', oi.dia
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY 
      o.id, o.fecha_entrega, o.status, o.observaciones, o.comprobante_url,
      o.comprobante_nombre, o.metodo_pago, o.tipo_menu, o.delivery_name, o.delivery_phone,
      u.name, u.last_name, u.email, up.telefono, up.direccion_principal, up.direccion_secundaria
    ORDER BY o.fecha_entrega DESC
  `);
  return result.rows.map(parsePedido);
};

export const updateOrderStatus = async (id, status) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    await client.query(
      'INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)',
      [id, status]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getOrderStatusHistory = async (orderId) => {
  const result = await pool.query(
    'SELECT status, changed_at FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC',
    [orderId]
  );
  return result.rows;
};

export const assignOrderToDelivery = async (orderId, deliveryId) => {
  const result = await pool.query(
    'UPDATE orders SET delivery_id = $1 WHERE id = $2 RETURNING *',
    [deliveryId, orderId]
  );
  return result.rows[0];
};

export const getOrdersByDelivery = async (deliveryId) => {
  const numericId = parseInt(deliveryId, 10);
  const result = await pool.query(`
    SELECT 
      o.id, o.fecha_entrega, o.status AS estado, o.observaciones,
      o.comprobante_url, o.comprobante_nombre,
      u.name AS nombre, u.email, up.telefono, up.direccion_principal,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name',
          CASE 
            WHEN oi.item_type = 'daily' THEN md.name
            WHEN oi.item_type = 'fijo' THEN mf.name
            WHEN oi.item_type = 'extra' THEN me.name
            WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
            ELSE NULL
          END,
        'quantity', oi.quantity
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_daily md ON md.id = CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_extras me ON me.id = CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    WHERE o.delivery_id = $1
    GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal
    ORDER BY o.fecha_entrega DESC
  `, [numericId]);

  return result.rows.map(parsePedido);
};

export const saveOrderComprobante = async (orderId, url, nombre = null) => {
  const result = await pool.query(
    'UPDATE orders SET comprobante_url = $1, comprobante_nombre = $2 WHERE id = $3 RETURNING *',
    [url, nombre, orderId]
  );
  return result.rows[0];
};

export const deleteOrder = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    const res = await client.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getOrderById = async (id) => {
  const result = await pool.query(`
    SELECT 
      o.id, o.fecha_entrega, o.status AS estado, o.observaciones,
      o.comprobante_url, o.comprobante_nombre,
      u.name AS nombre, u.email, up.telefono, up.direccion_principal,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name',
          CASE 
            WHEN oi.item_type = 'daily' THEN md.name
            WHEN oi.item_type = 'fijo' THEN mf.name
            WHEN oi.item_type = 'extra' THEN me.name
            WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
            ELSE NULL
          END,
        'quantity', oi.quantity
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_daily md ON md.id = oi.item_id AND oi.item_type = 'daily'
    LEFT JOIN menu_fixed mf ON mf.id = oi.item_id AND oi.item_type = 'fijo'
    LEFT JOIN menu_extras me ON me.id = oi.item_id AND oi.item_type = 'extra'
    WHERE o.id = $1
    GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal
  `, [id]);

  if (result.rows.length === 0) return null;
  return parsePedido(result.rows[0]);
};
