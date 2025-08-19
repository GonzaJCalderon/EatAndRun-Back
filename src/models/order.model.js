import { pool } from '../db/index.js';
import dayjs from '../utils/tiempo.js';
import { getSemanasActivas } from '../models/semanas.model.js';
import { pickFechaDesdePedidoBody, clampToSemanasActivas } from '../utils/fechaspedidos.js';

export const createOrder = async (userId, items, total, {
  fechaEntrega,
  observaciones,
  metodoPago,
  tipoMenu,
  comprobanteUrl = null
}) => {
  const client = await pool.connect();

  const TZ = 'America/Argentina/Buenos_Aires';
  const normalizeDia = (d) =>
    String(d || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const DIAS_VALIDOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

  const getMonday = (djs) => {
    const dow = djs.day(); // 0..6
    return djs.subtract((dow + 6) % 7, 'day').startOf('day');
  };

  try {
    await client.query('BEGIN');

    // 1) Traer semanas habilitadas reales (NO crear nuevas acá)
    const semanasActivas = await getSemanasActivas(); // [{ id, semana_inicio, semana_fin, habilitado, dias_habilitados }, ...]
    if (!semanasActivas.length) {
      throw new Error('No hay semanas habilitadas para tomar pedidos');
    }

    // 2) Determinar la fecha candidata
    //    - si viene `fechaEntrega`, la usamos
    //    - si no, intentamos deducirla del contenido (esta versión usa items con "dia")
    let candidata = null;

    if (fechaEntrega) {
      const f = dayjs(fechaEntrega).tz(TZ);
      if (!f.isValid()) throw new Error(`fechaEntrega inválida: ${fechaEntrega}`);
      candidata = f.startOf('day').toDate();
    } else {
      // Deducción desde items: si hay algún item con `dia`, mapearlo a la PRIMERA semana activa
      const firstActive = semanasActivas[0];
      const mondayFirst = dayjs(firstActive.semana_inicio).tz(TZ).startOf('day');
      const itemConDia = (items || []).find(it => DIAS_VALIDOS.includes(normalizeDia(it.dia)));
      if (itemConDia) {
        const diaNorm = normalizeDia(itemConDia.dia);
        const idx = DIAS_VALIDOS.indexOf(diaNorm); // 0..4
        const fechaDia = mondayFirst.add(idx, 'day').startOf('day');
        candidata = fechaDia.toDate();
      } else {
        // fallback: inicio de la primera semana activa
        candidata = mondayFirst.toDate();
      }
    }

    // 3) Forzar la fecha candidata a caer dentro de una semana habilitada
    let fechaForzada = clampToSemanasActivas(candidata, semanasActivas);
    if (!fechaForzada) {
      // si por algún motivo viene null, usa inicio de la primera semana
      fechaForzada = dayjs(semanasActivas[0].semana_inicio).tz(TZ).startOf('day').toDate();
    }

    // 4) Seleccionar la semana que contiene la fechaForzada
    const fechaDJ = dayjs(fechaForzada).tz(TZ).startOf('day');
    let semanaSel =
      semanasActivas.find(
        s => fechaDJ.isBetween(dayjs(s.semana_inicio).startOf('day'), dayjs(s.semana_fin).endOf('day'), 'day', '[]')
      ) || semanasActivas[0];

    // 5) Validar fecha dentro de semana (por las dudas)
    const inicio = dayjs(semanaSel.semana_inicio).tz(TZ).startOf('day');
    const fin    = dayjs(semanaSel.semana_fin).tz(TZ).endOf('day');
    if (!fechaDJ.isBetween(inicio, fin, 'day', '[]')) {
      // Snap a inicio de la semana seleccionada
      fechaForzada = inicio.toDate();
    }

    // 6) Filtrar items por días habilitados de la semana
    const diasHabilitados = semanaSel.dias_habilitados || {};
    const itemsFiltrados = [];
    for (const item of items || []) {
      if (!item.dia) { // sin día (tarta/skip/global) pasan
        itemsFiltrados.push(item);
        continue;
      }
      const diaNorm = normalizeDia(item.dia);
      if (!DIAS_VALIDOS.includes(diaNorm)) continue;
      if (!diasHabilitados[diaNorm]) continue;
      itemsFiltrados.push({ ...item, dia: diaNorm });
    }

    // 7) Crear orden con fecha_entrega FORZADA (queda dentro de semana habilitada)
    const orderInsert = await client.query(`
      INSERT INTO orders (user_id, total, fecha_entrega, observaciones, metodo_pago, tipo_menu, comprobante_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      userId,
      total,
      // guardamos a las 12:00 para evitar saltos por TZ/UTC al convertir
      dayjs(fechaForzada).tz(TZ).hour(12).minute(0).second(0).millisecond(0).toDate(),
      observaciones || '',
      metodoPago || null,
      tipoMenu || 'usuario',
      comprobanteUrl || null
    ]);

    const orderId = orderInsert.rows[0].id;

    // 8) Insertar ítems con fecha_dia calculada respecto al Lunes de la semana SELECCIONADA
    const mondayOfWeek = dayjs(semanaSel.semana_inicio).tz(TZ).startOf('day');

    for (const item of itemsFiltrados) {
      const { item_type, item_id, quantity, dia, precio } = item;
      if (!['daily', 'fijo', 'extra', 'tarta', 'skip'].includes(item_type)) continue;

      let fechaDia = null;
      if (dia) {
        const index = DIAS_VALIDOS.indexOf(dia); // 0..4
        if (index !== -1) {
          fechaDia = mondayOfWeek.add(index, 'day').startOf('day').toDate();
        }
      }

      // Resolver nombre/id como ya lo hacías
      let finalItemId = null;
      let finalItemName = null;

      if (item_type === 'tarta' || item_type === 'skip') {
        finalItemName = String(item_id ?? '');
      }

      if (['daily', 'fijo', 'extra'].includes(item_type)) {
        finalItemId = !isNaN(parseInt(item_id)) ? parseInt(item_id) : null;
        const tabla =
          item_type === 'daily' ? 'menu_daily' :
          item_type === 'fijo'  ? 'menu_fixed' :
          item_type === 'extra' ? 'menu_extras' : null;

        if (tabla && finalItemId !== null) {
          const resNombre = await client.query(`SELECT name FROM ${tabla} WHERE id = $1`, [finalItemId]);
          finalItemName = resNombre.rows[0]?.name || `ID:${finalItemId}`;
        } else if (!finalItemName) {
          finalItemName = `ID:${item_id}`;
        }
      }

      await client.query(`
        INSERT INTO order_items (
          order_id, item_type, item_id, item_name, quantity, dia, precio_unitario, fecha_dia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        orderId,
        item_type,
        finalItemId,
        finalItemName,
        Number(quantity) || 0,
        dia || null,
        precio ?? null,
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

      u.name      AS nombre,
      u.last_name AS apellido,
      u.email,
      up.telefono,
      up.direccion_principal,
      up.direccion_alternativa,
      up.direccion_alternativa AS direccion_secundaria,  -- 👈 ojo, coma acá

      COALESCE(
        json_agg(DISTINCT jsonb_build_object(
          'item_type',  oi.item_type,
          'item_id',    oi.item_id,
          'item_name',
            CASE 
              WHEN oi.item_type = 'daily' THEN md.name
              WHEN oi.item_type = 'fijo'  THEN mf.name
              WHEN oi.item_type = 'extra' THEN me.name
              WHEN oi.item_type = 'tarta' THEN oi.item_id::text
              ELSE oi.item_id
            END,
          'quantity',   oi.quantity,
          'dia',        oi.dia,
          'fecha_dia',  oi.fecha_dia
        )) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
      ) AS items

    FROM orders o
    JOIN users u          ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN public.order_items oi ON o.id = oi.order_id

    LEFT JOIN menu_daily md ON md.id = 
      CASE WHEN oi.item_type = 'daily' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::int ELSE NULL END
    LEFT JOIN menu_fixed mf ON mf.id = 
      CASE WHEN oi.item_type = 'fijo'  AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::int ELSE NULL END
    LEFT JOIN menu_extras me ON me.id = 
      CASE WHEN oi.item_type = 'extra' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::int ELSE NULL END

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
      u.last_name,                -- 👈 sin AS acá
      u.email,
      up.telefono,
      up.direccion_principal,
      up.direccion_alternativa,
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

    // ⬇️⬇️ REEMPLAZAR ESTE BLOQUE "usuario" ⬇️⬇️
    usuario: {
      nombre: row.nombre || '',
      apellido: row.apellido || '', // ✅ viene de u.last_name AS apellido
      email: row.email,
      telefono: row.telefono || '',
      direccion: row.direccion_principal || '',
      // ✅ prioriza direccion_alternativa, mantiene compat con direccion_secundaria
      direccionSecundaria: row.direccion_alternativa || row.direccion_secundaria || ''
    },
    // ⬆️⬆️ REEMPLAZAR ESTE BLOQUE "usuario" ⬆️⬆️

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
    u.name      AS usuario_nombre,
    u.email     AS usuario_email,
    u.role_id   AS usuario_rol,         -- 👈 role_id (no u.role)
    d.name      AS repartidor_nombre,
    up.telefono AS usuario_telefono,
    up.direccion_principal AS direccion_principal,
    up.direccion_secundaria AS direccion_secundaria,
    u.last_name AS usuario_apellido,    -- 👈 apellido viene de users
    em.razon_social AS empresa_nombre
  FROM orders o
  LEFT JOIN users u         ON o.user_id     = u.id
  LEFT JOIN users d         ON o.assigned_to = d.id
  LEFT JOIN user_profiles up ON up.user_id   = u.id
  LEFT JOIN empresa_users eu ON eu.user_id   = u.id
  LEFT JOIN empresas em      ON em.id        = eu.empresa_id
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







