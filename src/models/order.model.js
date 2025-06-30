import { pool } from '../db/index.js';

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

    // 1️⃣ Insertar orden base
    const orderInsert = await client.query(`
      INSERT INTO orders (user_id, total, fecha_entrega, observaciones, metodo_pago, tipo_menu, comprobante_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [userId, total, fechaEntrega, observaciones, metodoPago, tipoMenu, comprobanteUrl]);

    const orderId = orderInsert.rows[0].id;

    // 2️⃣ Insertar cada item con nombre resuelto
    for (const item of items) {
      const { item_type, item_id, quantity, dia, precio } = item;

      if (!['daily', 'fijo', 'extra', 'tarta', 'skip'].includes(item_type)) {
        console.warn(`⚠️ Tipo de ítem no soportado: ${item_type}`);
        continue;
      }

      let finalItemId = null;
      let finalItemName = null;

      // 🥧 Casos especiales como "tarta" que usan string como nombre
      if (item_type === 'tarta' || item_type === 'skip') {
        finalItemName = String(item_id);
      }

      // 📦 Si es un ID numérico (daily, fijo, extra), obtener nombre desde DB
      if (['daily', 'fijo', 'extra'].includes(item_type)) {
        finalItemId = !isNaN(parseInt(item_id)) ? parseInt(item_id) : null;

        const tabla =
          item_type === 'daily' ? 'daily_menu' :
          item_type === 'fijo' ? 'fixed_menu' :
          item_type === 'extra' ? 'menu_extras' :
          null;

        if (tabla && finalItemId !== null) {
          const resNombre = await client.query(`SELECT name FROM ${tabla} WHERE id = $1`, [finalItemId]);
          finalItemName = resNombre.rows[0]?.name || `ID:${finalItemId}`;
        }
      }

      // 💾 Insertar el ítem final
      await client.query(`
        INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId,
        item_type,
        finalItemId,
        finalItemName,
        quantity,
        dia || null,
        precio || null
      ]);
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


// 👇 esto puede ir al inicio del archivo si no está ya definido
function agruparItemsPorTipo(items) {
  const agrupados = {
    diarios: {},
    extras: {},
    tartas: {}
  };

  for (const item of items) {
    const nombre = item.resolved_name || item.item_name || 'Desconocido';
    const tipo = item.item_type;
    const dia = item.dia || 'sin_dia';

    const cantidad = Number(item.quantity);
    if (isNaN(cantidad)) continue;

    if (['daily', 'fijo'].includes(tipo)) {
      if (!agrupados.diarios[dia]) agrupados.diarios[dia] = {};
      agrupados.diarios[dia][nombre] = (agrupados.diarios[dia][nombre] || 0) + cantidad;
    } else if (tipo === 'extra') {
      if (!agrupados.extras[dia]) agrupados.extras[dia] = {};
      agrupados.extras[dia][nombre] = (agrupados.extras[dia][nombre] || 0) + cantidad;
    } else if (tipo === 'tarta') {
      agrupados.tartas[nombre] = (agrupados.tartas[nombre] || 0) + cantidad;
    }
  }

  return agrupados;
}

// ✅ REEMPLAZÁ esta función completa
export const getOrdersByUser = async (userId) => {
  const pedidosRes = await pool.query(`
    SELECT 
      o.*,
      u.name AS usuario_nombre,
      u.last_name AS usuario_apellido,
      u.email AS usuario_email,
      up.telefono AS usuario_telefono,
      up.direccion_principal,
      up.direccion_secundaria
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
  `, [userId]);

  const pedidos = pedidosRes.rows;
  if (pedidos.length === 0) return [];

  const pedidoIds = pedidos.map(p => p.id);
  const itemsRes = await pool.query(`
    SELECT 
      oi.order_id,
      oi.item_type, 
      oi.item_id, 
      oi.item_name,
      oi.quantity, 
      oi.dia,
      COALESCE(
        CASE 
          WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN me.name
          WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN md.name
          WHEN oi.item_type = 'fijo'  AND oi.item_id ~ '^[0-9]+$' THEN mf.name
          WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
          ELSE NULL
        END,
        oi.item_name,
        CONCAT('ID:', oi.item_id),
        'Desconocido'
      ) AS resolved_name
    FROM order_items oi
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_daily md ON md.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    WHERE oi.order_id = ANY($1::int[])
  `, [pedidoIds]);

  const itemsPorPedido = {};
  for (const item of itemsRes.rows) {
    const id = item.order_id;
    if (!itemsPorPedido[id]) itemsPorPedido[id] = [];
    itemsPorPedido[id].push(item);
  }

  return pedidos.map(pedido => {
    const items = itemsPorPedido[pedido.id] || [];
    return {
      id: pedido.id,
      fecha_entrega: pedido.fecha_entrega,
      estado: pedido.status,
      observaciones: pedido.observaciones,
      comprobante_url: pedido.comprobante_url,
      comprobante_nombre: pedido.comprobante_nombre,
      metodo_pago: pedido.metodo_pago,
      tipo_menu: pedido.tipo_menu,
      delivery_name: pedido.delivery_name,
      delivery_phone: pedido.delivery_phone,
      usuario: {
        nombre: `${pedido.usuario_nombre} ${pedido.usuario_apellido || ''}`.trim(),
        email: pedido.usuario_email,
        telefono: pedido.usuario_telefono,
        direccion: pedido.direccion_principal,
        direccionSecundaria: pedido.direccion_secundaria || ''
      },
      pedido: agruparItemsPorTipo(items)
    };
  });
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
      o.metodo_pago,
      o.tipo_menu,
      o.delivery_name,
      o.delivery_phone,

      u.name AS nombre,
      u.last_name AS apellido,
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

    GROUP BY 
      o.id,
      o.fecha_entrega,
      o.status,
      o.observaciones,
      o.comprobante_url,
      o.comprobante_nombre,
      o.metodo_pago,
      o.tipo_menu,
      o.delivery_name,
      o.delivery_phone,
      u.name,
      u.last_name,
      u.email,
      up.telefono,
      up.direccion_principal,
      up.direccion_secundaria

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
LEFT JOIN menu_extras me ON oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' AND me.id = oi.item_id::INTEGER


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
    const dia = item.dia;

    if (tipo === 'tarta') {
      pedido.tartas[nombre] = (pedido.tartas[nombre] || 0) + cantidad;
    } else if (dia) {
      if (tipo === 'daily' || tipo === 'fijo') {
        if (!pedido.diarios[dia]) pedido.diarios[dia] = {};
        pedido.diarios[dia][nombre] = (pedido.diarios[dia][nombre] || 0) + cantidad;
      } else if (tipo === 'extra') {
        if (!pedido.extras[dia]) pedido.extras[dia] = {};
        pedido.extras[dia][nombre] = (pedido.extras[dia][nombre] || 0) + cantidad;
      }
    }
  });

  return {
    id: row.id,
    estado: row.estado,
    fecha: row.fecha_entrega,
    observaciones: row.observaciones,
    comprobanteUrl: row.comprobante_url,
    comprobanteNombre: row.comprobante_nombre,
    metodoPago: row.metodo_pago || null, // ✅ Añadido campo clave
    usuario: {
      nombre: `${row.nombre} ${row.apellido || ''}`.trim(), // por si no hay apellido
      email: row.email,
      telefono: row.telefono,
      direccion: row.direccion_principal,
      direccionSecundaria: row.direccion_secundaria || ''
    },
    delivery: {
      nombre: row.delivery_name || null,
      telefono: row.delivery_phone || null
    },
    pedido
  };
}




export const getOrdersByDeliveryId = async (deliveryId) => {
  const query = 'SELECT * FROM orders WHERE delivery_id = $1';
  const { rows } = await db.query(query, [deliveryId]);
  return rows;
};


export const getPedidosConItems = async (filtros = '', valores = []) => {
  // 1️⃣ Obtener todos los pedidos
  const pedidosRes = await pool.query(`
    SELECT 
      o.*,
      u.name AS usuario_nombre,
      u.email AS usuario_email,
      u.role AS usuario_rol,
      d.name AS repartidor_nombre,
      up.telefono AS usuario_telefono,
      up.direccion_principal AS direccion_principal,
      up.direccion_secundaria AS direccion_secundaria,
      up.apellido AS usuario_apellido -- ✅ Agregado apellido
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users d ON o.assigned_to = d.id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    ${filtros}
    ORDER BY o.created_at DESC
  `, valores);

  const pedidos = pedidosRes.rows;
  if (pedidos.length === 0) return [];

  // 2️⃣ Obtener todos los ítems en una sola query
  const pedidoIds = pedidos.map(p => p.id);
  const itemsRes = await pool.query(`
    SELECT 
      oi.order_id,
      oi.item_type, 
      oi.item_id, 
      oi.item_name,
      oi.quantity, 
      oi.dia,
      COALESCE(
        CASE 
          WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN me.name
          WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN md.name
          WHEN oi.item_type = 'fijo'  AND oi.item_id ~ '^[0-9]+$' THEN mf.name
          WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
          ELSE NULL
        END,
        oi.item_name,
        CONCAT('ID:', oi.item_id),
        'Desconocido'
      ) AS resolved_name
    FROM order_items oi
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_daily md ON md.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    WHERE oi.order_id = ANY($1::int[])
  `, [pedidoIds]);

  // 3️⃣ Agrupar ítems por pedido
  const itemsPorPedido = {};
  for (const item of itemsRes.rows) {
    const id = item.order_id;
    if (!itemsPorPedido[id]) itemsPorPedido[id] = [];
    itemsPorPedido[id].push(item);
  }

  // 4️⃣ Armar la estructura final
  const pedidosConItems = pedidos.map(pedido => {
    const items = itemsPorPedido[pedido.id] || [];

    return {
      ...pedido,
      usuario: {
        nombre: pedido.usuario_nombre,
        apellido: pedido.usuario_apellido || '', // ✅ agregado apellido
        email: pedido.usuario_email,
        telefono: pedido.usuario_telefono || '',
        direccion: pedido.direccion_principal || '',
        direccionSecundaria: pedido.direccion_secundaria || '',
        rol: pedido.usuario_rol
      },
      repartidor: pedido.repartidor_nombre || null,
      pedido: agruparItemsPorTipo(items),
      estado: pedido.status,
      fecha: pedido.fecha_entrega,
      observaciones: pedido.observaciones,
      comprobanteUrl: pedido.comprobante_url,
      comprobanteNombre: pedido.comprobante_nombre,
      tipo_menu: pedido.tipo_menu || 'usuario'
    };
  });

  return pedidosConItems;
};



// agrupadorItemsPorTipo.js
function agruparItemsPorTipo(items) {
  const agrupados = {
    diarios: {},
    extras: {},
    tartas: {}
  };

  for (const item of items) {
    const nombre = item.resolved_name || item.item_name || 'Desconocido';
    const tipo = item.item_type;
    const dia = item.dia || 'sin_dia';

    const cantidad = Number(item.quantity);
    if (isNaN(cantidad)) continue;

    if (['daily', 'fijo'].includes(tipo)) {
      if (!agrupados.diarios[dia]) agrupados.diarios[dia] = {};
      agrupados.diarios[dia][nombre] = (agrupados.diarios[dia][nombre] || 0) + cantidad;
    } else if (tipo === 'extra') {
      if (!agrupados.extras[dia]) agrupados.extras[dia] = {};
      agrupados.extras[dia][nombre] = (agrupados.extras[dia][nombre] || 0) + cantidad;
    } else if (tipo === 'tarta') {
      agrupados.tartas[nombre] = (agrupados.tartas[nombre] || 0) + cantidad;
    }
  }

  return agrupados;
}

export const getPedidoConItemsById = async (id) => {
  const pedidosRes = await pool.query(`
    SELECT 
      o.*,
      u.name AS usuario_nombre,
      u.email AS usuario_email,
      u.role AS usuario_rol,
      d.name AS repartidor_nombre,
      up.telefono AS usuario_telefono,
      up.direccion_principal,
      up.direccion_secundaria,
      up.apellido AS usuario_apellido
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users d ON o.assigned_to = d.id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE o.id = $1
  `, [id]);

  if (pedidosRes.rows.length === 0) return null;
  const pedido = pedidosRes.rows[0];

  const itemsRes = await pool.query(`
    SELECT 
      oi.order_id,
      oi.item_type, 
      oi.item_id, 
      oi.item_name,
      oi.quantity, 
      oi.dia,
      COALESCE(
        CASE 
          WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN me.name
          WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN md.name
          WHEN oi.item_type = 'fijo'  AND oi.item_id ~ '^[0-9]+$' THEN mf.name
          WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
          ELSE NULL
        END,
        oi.item_name,
        CONCAT('ID:', oi.item_id),
        'Desconocido'
      ) AS resolved_name
    FROM order_items oi
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_daily md ON md.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END
    WHERE oi.order_id = $1
  `, [id]);

  const items = itemsRes.rows;

  return {
    ...pedido,
    usuario: {
      nombre: pedido.usuario_nombre,
      apellido: pedido.usuario_apellido || '',
      email: pedido.usuario_email,
      telefono: pedido.usuario_telefono || '',
      direccion: pedido.direccion_principal || '',
      direccionSecundaria: pedido.direccion_secundaria || '',
      rol: pedido.usuario_rol
    },
    repartidor: pedido.repartidor_nombre || null,
    pedido: agruparItemsPorTipo(items),
    estado: pedido.status,
    fecha: pedido.fecha_entrega,
    observaciones: pedido.observaciones,
    comprobanteUrl: pedido.comprobante_url,
    comprobanteNombre: pedido.comprobante_nombre,
    tipo_menu: pedido.tipo_menu || 'usuario'
  };
};







