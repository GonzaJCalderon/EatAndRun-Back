import { pool } from '../db/index.js';

export const createKitchenOrder = async ({ fecha_entrega, nombre_cliente, observaciones, items }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'INSERT INTO kitchen_orders (fecha_entrega, nombre_cliente, observaciones) VALUES ($1, $2, $3) RETURNING *',
      [fecha_entrega, nombre_cliente, observaciones]
    );

    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      await client.query(
        'INSERT INTO kitchen_order_items (kitchen_order_id, categoria, nombre_item, cantidad) VALUES ($1, $2, $3, $4)',
        [orderId, item.categoria, item.nombre_item, item.cantidad]
      );
    }

    await client.query('COMMIT');
    return orderRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getItemsByDate = async (fecha) => {
  const result = await pool.query(
    `SELECT nombre_item, categoria, SUM(cantidad) as total
     FROM kitchen_order_items
     JOIN kitchen_orders ON kitchen_order_items.kitchen_order_id = kitchen_orders.id
     WHERE kitchen_orders.fecha_entrega = $1
     GROUP BY nombre_item, categoria
     ORDER BY categoria, nombre_item`,
    [fecha]
  );
  return result.rows;
};
