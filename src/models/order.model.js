import { pool } from '../db/index.js';

// Crear nuevo pedido
export const createOrder = async (userId, items, total, extra = {}) => {
  const {
    metodoPago = null,
    observaciones = null,
    comprobanteUrl = null,
    comprobanteNombre = null,
    fechaEntrega = null
  } = extra;

  const result = await pool.query(
    `INSERT INTO orders 
     (user_id, total, metodo_pago, observaciones, comprobante_url, comprobante_nombre, fecha_entrega)
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [userId, total, metodoPago, observaciones, comprobanteUrl, comprobanteNombre, fechaEntrega]
  );

  const orderId = result.rows[0].id;

  for (const item of items) {
    const tipo = item.item_type === 'fixed' ? 'fijo' : item.item_type;

    await pool.query(
      'INSERT INTO order_items (order_id, item_type, item_id, quantity, dia) VALUES ($1, $2, $3, $4, $5)',
      [orderId, tipo, item.item_id, item.quantity, item.dia || null]
    );
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
      o.id,
      o.fecha_entrega,
      o.status AS estado,
      o.observaciones,
      o.comprobante_url,
      o.comprobante_nombre,
      u.name AS nombre,
      u.email,
      up.telefono,
      up.direccion_principal,
      up.direccion_secundaria,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name',
          CASE 
            WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' 
              THEN (SELECT name FROM menu_daily WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' 
              THEN (SELECT name FROM menu_fixed WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' 
              THEN (SELECT name FROM menu_extras WHERE id = oi.item_id::INTEGER)
            WHEN oi.item_type = 'tarta' 
              THEN oi.item_id::TEXT
            ELSE oi.item_id
          END,
        'quantity', oi.quantity,
        'dia', oi.dia
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal, up.direccion_secundaria
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
  const numericId = parseInt(deliveryId, 10); // 🔐 fuerza conversión segura

  const result = await pool.query(`
    SELECT 
      o.id,
      o.fecha_entrega,
      o.status AS estado,
      o.observaciones,
      o.comprobante_url,
      o.comprobante_nombre,
      u.name AS nombre,
      u.email,
      up.telefono,
      up.direccion_principal,
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
 LEFT JOIN menu_daily md ON md.id = 
  CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
LEFT JOIN menu_fixed mf ON mf.id = 
  CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
LEFT JOIN menu_extras me ON me.id = 
  CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END

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
      o.id,
      o.fecha_entrega,
      o.status AS estado,
      o.observaciones,
      o.comprobante_url,
      o.comprobante_nombre,
      u.name AS nombre,
      u.email,
      up.telefono,
      up.direccion_principal,
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

export const getUnassignedOrdersFromDB = async () => {
  const result = await pool.query(`
    SELECT 
      o.id,
      o.fecha_entrega,
      o.status AS estado,
      o.observaciones,
      o.comprobante_url,
      o.comprobante_nombre,
      u.name AS nombre,
      u.email,
      up.telefono,
      up.direccion_principal,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name',
          CASE 
            WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN dm.name
            WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN fm.name
            WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN me.name
            WHEN oi.item_type = 'tarta' THEN oi.item_id
            ELSE NULL
          END,
        'quantity', oi.quantity,
        'dia', oi.dia
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN daily_menu dm ON dm.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN fixed_menu fm ON fm.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    WHERE o.delivery_id IS NULL
      AND o.status IN ('pendiente', 'preparando')
    GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal
    ORDER BY o.fecha_entrega DESC
  `);

  return result.rows.map(parsePedido);
};


// Función utilitaria
function parsePedido(row) {
  const pedido = {
    diarios: {},
    extras: {},
    tartas: {}
  };

row.items.forEach((item) => {
  const tipo = item.item_type;
  const nombre = item.item_name || item.item_id;
  const cantidad = item.quantity;

  if (!item.dia) return; // ✅ Ignorar ítems sin día
  const dia = item.dia;

  if (tipo === 'daily' || tipo === 'fijo') {
    if (!pedido.diarios[dia]) pedido.diarios[dia] = {};
    pedido.diarios[dia][nombre] = (pedido.diarios[dia][nombre] || 0) + cantidad;
  } else if (tipo === 'extra') {
    if (!pedido.extras[dia]) pedido.extras[dia] = {};
    pedido.extras[dia][nombre] = (pedido.extras[dia][nombre] || 0) + cantidad;
  } else if (tipo === 'tarta') {
    pedido.tartas[nombre] = cantidad;
  }
});


  return {
    id: row.id,
    estado: row.estado,
    fecha: row.fecha_entrega,
    observaciones: row.observaciones,
    comprobanteUrl: row.comprobante_url,
    comprobanteNombre: row.comprobante_nombre,
    usuario: {
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      direccion: row.direccion_principal
    },
    pedido
  };
}



export const getOrdersByDeliveryId = async (deliveryId) => {
  const query = 'SELECT * FROM orders WHERE delivery_id = $1';
  const { rows } = await db.query(query, [deliveryId]);
  return rows;
};


export const getPedidosConItems = async (whereSQL = '', values = []) => {
  const result = await pool.query(`
    SELECT 
      o.*,
      u.name AS usuario_nombre,
      u.email,
      up.telefono,
      up.direccion_principal,
      json_agg(json_build_object(
        'item_type', oi.item_type,
        'item_id', oi.item_id,
        'item_name', 
          CASE 
            WHEN oi.item_type = 'daily' THEN dm.name
            WHEN oi.item_type = 'fijo' THEN fm.name
            WHEN oi.item_type = 'extra' THEN me.name
            WHEN oi.item_type = 'tarta' THEN oi.item_id
            ELSE NULL
          END,
        'quantity', oi.quantity,
        'dia', oi.dia
      )) AS items
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN daily_menu dm ON dm.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN fixed_menu fm ON fm.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    ${whereSQL}
    GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal
    ORDER BY o.created_at DESC
  `, values);

  return result.rows.map(row => {
    const pedido = {
      diarios: {},
      extras: {},
      tartas: {}
    };

    row.items.forEach((item) => {
      const tipo = item.item_type;
      const nombre = item.item_name || item.item_id;
      const dia = item.dia || 'sin_dia';
      const cantidad = Number(item.quantity);
      if (isNaN(cantidad)) return;

      if (tipo === 'daily' || tipo === 'fijo') {
        if (!pedido.diarios[dia]) pedido.diarios[dia] = {};
        pedido.diarios[dia][nombre] = (pedido.diarios[dia][nombre] || 0) + cantidad;
      } else if (tipo === 'extra') {
        if (!pedido.extras[dia]) pedido.extras[dia] = {};
        pedido.extras[dia][nombre] = (pedido.extras[dia][nombre] || 0) + cantidad;
      } else if (tipo === 'tarta') {
        pedido.tartas[nombre] = (pedido.tartas[nombre] || 0) + cantidad;
      }
    });

    return {
      id: row.id,
      usuario: {
        nombre: row.usuario_nombre,
        email: row.email,
        telefono: row.telefono,
        direccion: row.direccion_principal,
      },
      estado: row.status,
      fecha: row.fecha_entrega,
      observaciones: row.observaciones,
      comprobanteUrl: row.comprobante_url,
      comprobanteNombre: row.comprobante_nombre,
      pedido
    };
  });
};
