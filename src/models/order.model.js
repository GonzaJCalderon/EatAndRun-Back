import { pool } from '../db/index.js';
import dayjs from '../utils/tiempo.js';



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

    // 🔍 Buscar o crear semana automáticamente
    const buscarSemana = async (fecha) => {
      const query = `
        SELECT semana_inicio, semana_fin, dias_habilitados
        FROM menu_semana
        WHERE habilitado = true
          AND $1::date BETWEEN semana_inicio AND semana_fin
        LIMIT 1
      `;
      const { rows } = await client.query(query, [fecha]);
      return rows[0] || null;
    };

    let semana = await buscarSemana(fechaEntrega);

    if (!semana) {
      // ⚙️ Crear semana automáticamente
      const fecha = dayjs(fechaEntrega);
      const lunes = fecha.startOf('week').add(1, 'day').toDate();
      const viernes = fecha.startOf('week').add(5, 'day').toDate();
      const cierre = dayjs(viernes).set('hour', 20).set('minute', 0).set('second', 0).toDate();

      const dias_habilitados = {
        lunes: true,
        martes: true,
        miercoles: true,
        jueves: true,
        viernes: true
      };

      const insert = await client.query(`
        INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre, dias_habilitados)
        VALUES ($1, $2, true, $3, $4)
        RETURNING semana_inicio, semana_fin, dias_habilitados
      `, [lunes, viernes, cierre, dias_habilitados]);

      semana = insert.rows[0];
    }

    // 2️⃣ Validar rango
    const fechaDia = dayjs(fechaEntrega);
    const inicio = dayjs(semana.semana_inicio);
    const fin = dayjs(semana.semana_fin);

    if (!fechaDia.isBetween(inicio, fin, 'day', '[]')) {
      throw new Error(`La fecha de entrega (${fechaEntrega}) no está dentro de la semana habilitada (${inicio.format('YYYY-MM-DD')} - ${fin.format('YYYY-MM-DD')})`);
    }

    // 3️⃣ Filtrar ítems válidos según días habilitados
    const diasHabilitados = semana.dias_habilitados;
    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const itemsFiltrados = [];

    for (const item of items) {
      if (!item.dia) {
        itemsFiltrados.push(item);
        continue;
      }

      const diaLower = item.dia.toLowerCase();

      if (!diasValidos.includes(diaLower)) continue;
      if (!diasHabilitados?.[diaLower]) continue;

      itemsFiltrados.push(item);
    }

    // 4️⃣ Crear orden
    const orderInsert = await client.query(`
      INSERT INTO orders (user_id, total, fecha_entrega, observaciones, metodo_pago, tipo_menu, comprobante_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [userId, total, fechaEntrega, observaciones, metodoPago, tipoMenu, comprobanteUrl]);

    const orderId = orderInsert.rows[0].id;

    // 5️⃣ Insertar ítems
    for (const item of itemsFiltrados) {
      const { item_type, item_id, quantity, dia, precio } = item;
        // 🧠 Calcular fecha exacta del día (ej. lunes => 2025-07-28)
  let fechaDia = null;
  if (dia) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const base = dayjs(fechaEntrega).startOf('week').add(1, 'day'); // lunes
    const index = dias.indexOf(dia.toLowerCase());
    if (index !== -1) {
      fechaDia = base.add(index, 'day').toDate();
    }
  }


      if (!['daily', 'fijo', 'extra', 'tarta', 'skip'].includes(item_type)) continue;

      let finalItemId = null;
      let finalItemName = null;

      if (item_type === 'tarta' || item_type === 'skip') {
        finalItemName = String(item_id);
      }

      if (['daily', 'fijo', 'extra'].includes(item_type)) {
        finalItemId = !isNaN(parseInt(item_id)) ? parseInt(item_id) : null;
        const tabla =
          item_type === 'daily' ? 'daily_menu' :
          item_type === 'fijo' ? 'fixed_menu' :
          item_type === 'extra' ? 'menu_extras' : null;

        if (tabla && finalItemId !== null) {
          const resNombre = await client.query(`SELECT name FROM ${tabla} WHERE id = $1`, [finalItemId]);
          finalItemName = resNombre.rows[0]?.name || `ID:${finalItemId}`;
        }
      }

     await client.query(`
  INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario, fecha_dia)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`, [
  orderId,
  item_type,
  finalItemId,
  finalItemName,
  quantity,
  dia || null,
  precio || null,
  fechaDia
]);

    }

    await client.query('COMMIT');

    return {
      id: orderId,
      message: 'Pedido creado correctamente',
      cantidadItems: itemsFiltrados.length
    };

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

      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'item_type', oi.item_type,
          'item_id', oi.item_id,
          'item_name',
            CASE 
              WHEN oi.item_type = 'daily' THEN md.name
              WHEN oi.item_type = 'fijo' THEN mf.name
              WHEN oi.item_type = 'extra' THEN me.name
              WHEN oi.item_type = 'tarta' THEN oi.item_id::TEXT
              ELSE oi.item_id
            END,
          'quantity', oi.quantity,
          'dia', oi.dia,
          'fecha_dia', oi.fecha_dia
        )) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) AS items

    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN public.order_items oi ON o.id = oi.order_id

    LEFT JOIN menu_daily md ON md.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = 
      CASE WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::INTEGER ELSE NULL END

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

  // 🧠 AÑADIDO: Mapear fechas reales por cada día textual
  const fechaPorDia = {};
  row.items.forEach((item) => {
    if (item.dia && item.fecha_dia) {
      const diaLower = item.dia.toLowerCase();
      if (!fechaPorDia[diaLower]) {
        fechaPorDia[diaLower] = dayjs(item.fecha_dia).format('YYYY-MM-DD');
      }
    }
  });
  pedido.fecha_dia_por_dia = fechaPorDia;

  return {
    id: row.id,
    estado: row.estado,
    fecha: row.fecha_entrega,
    observaciones: row.observaciones,
    comprobanteUrl: row.comprobante_url,
    comprobanteNombre: row.comprobante_nombre,
    metodoPago: row.metodo_pago || null,
    usuario: {
      nombre: `${row.nombre} ${row.apellido || ''}`.trim(),
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
      o.nota_admin,
      u.name AS usuario_nombre,
      u.email AS usuario_email,
      u.role AS usuario_rol,
      d.name AS repartidor_nombre,
      up.telefono AS usuario_telefono,
      up.direccion_principal AS direccion_principal,
      up.direccion_secundaria AS direccion_secundaria,
      up.apellido AS usuario_apellido,
      em.razon_social AS empresa_nombre
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN users d ON o.assigned_to = d.id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN empresa_users eu ON eu.user_id = u.id
    LEFT JOIN empresas em ON em.id = eu.empresa_id
    ${filtros}
    ORDER BY o.created_at DESC
  `, valores);

  const pedidos = pedidosRes.rows;
  if (pedidos.length === 0) return [];

  // 2️⃣ Obtener todos los ítems en una sola query
  const pedidoIds = pedidos.map(p => p.id);
  // ✅ Verificar que la columna 'fecha_dia' exista antes de usarla
const check = await pool.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'order_items'
    AND column_name = 'fecha_dia';
`);

console.log('🧪 ¿fecha_dia existe en order_items?', check.rows.length > 0);
const debugDb = await pool.query(`SELECT current_database(), current_schema();`);
console.log('📍 DB actual:', debugDb.rows[0]);

  const itemsRes = await pool.query(`
 SELECT 
  oi.order_id,
  oi.item_type, 
  oi.item_id, 
  oi.item_name,
  oi.quantity, 
  oi.dia,
  oi.precio_unitario,
  oi.fecha_dia,

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
   FROM public.order_items oi

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

  // 4️⃣ Armar estructura final con fecha_dia_por_dia
  const pedidosConItems = pedidos.map(pedido => {
    const items = itemsPorPedido[pedido.id] || [];

    // 🗓️ Mapear fechas de entrega por día textual
    const fechaPorDia = {};
    for (const item of items) {
      if (item.dia && item.fecha_dia) {
        const diaLower = item.dia.toLowerCase();
        if (!fechaPorDia[diaLower]) {
          fechaPorDia[diaLower] = dayjs(item.fecha_dia).format('YYYY-MM-DD');
        }
      }
    }

    const pedidoAgrupado = agruparItemsPorTipo(items);
    pedidoAgrupado.fecha_dia_por_dia = fechaPorDia;

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
      empresa_nombre: pedido.empresa_nombre || null,
      repartidor: pedido.repartidor_nombre || null,
      pedido: pedidoAgrupado,
      estado: pedido.status,
      fecha: pedido.fecha_entrega,
      observaciones: pedido.observaciones,
      nota_admin: pedido.nota_admin || null,
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
    const fecha = item.fecha_dia ? dayjs(item.fecha_dia) : null;

    const cantidad = Number(item.quantity);
    if (isNaN(cantidad)) continue;

    // 🧠 Creamos clave combinada: "lunes 28/07"
    let claveDia = dia;
    if (fecha && dia !== 'sin_dia') {
      const nombreDia = fecha.format('dddd'); // lunes, martes, etc.
      const fechaTexto = fecha.format('DD/MM');
      claveDia = `${nombreDia} ${fechaTexto}`;
    }

    if (['daily', 'fijo'].includes(tipo)) {
      if (!agrupados.diarios[claveDia]) agrupados.diarios[claveDia] = {};
      agrupados.diarios[claveDia][nombre] = (agrupados.diarios[claveDia][nombre] || 0) + cantidad;
    } else if (tipo === 'extra') {
      if (!agrupados.extras[claveDia]) agrupados.extras[claveDia] = {};
      agrupados.extras[claveDia][nombre] = (agrupados.extras[claveDia][nombre] || 0) + cantidad;
    } else if (tipo === 'tarta') {
      agrupados.tartas[nombre] = (agrupados.tartas[nombre] || 0) + cantidad;
    }
  }

  return agrupados;
}
export const getPedidoConItemsById = async (id) => {
  const pedidos = await getPedidosConItems('WHERE o.id = $1', [id]);
  const pedido = pedidos[0] || null;

  if (!pedido) return null;

  // ✅ Extra: historial de estados
  const result = await pool.query(
    'SELECT status, changed_at FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC',
    [id]
  );

  pedido.historialEstados = result.rows;

  return pedido;
};

export const getPedidosPorEmpresa = async (empresaId) => {
  // NO agregues otro JOIN, solo el filtro
  const query = `
    WHERE eu.empresa_id = $1
  `;
  return await getPedidosConItems(query, [empresaId]);
};







