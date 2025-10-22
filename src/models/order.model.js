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

try {
  await client.query('BEGIN');

  console.log('🔍 Items recibidos en createOrder:', JSON.stringify(items, null, 2));

  const semanasActivas = await getSemanasActivas();
  if (!semanasActivas.length) {
    throw new Error('No hay semanas habilitadas para tomar pedidos');
  }

  // ✅ <-- ACA DECLARAMOS ESTA VARIABLE
  let fechaEntregaFinal = null;

  // ✅ Extraer la primera fecha real de entrega desde los ítems
  const fechasItems = items
    .map(i => {
      if (!i.dia) return null;
      const partes = String(i.dia).split('-'); // ej: "miercoles-2025-10-22"
      if (partes.length === 4) {
        return dayjs(`${partes[1]}-${partes[2]}-${partes[3]}`, 'YYYY-MM-DD')
          .tz(TZ)
          .startOf('day');
      }
      return null;
    })
    .filter(f => f && f.isValid());


// ✅ Si hay fechas de ítems, se toma la más cercana (mínima)
if (fechasItems.length > 0) {
  fechaEntregaFinal = dayjs.min(...fechasItems);
  console.log("✅ Fecha de entrega tomada de los ítems:", fechaEntregaFinal.format('YYYY-MM-DD'));
} else {
  throw new Error('No se pudo determinar una fecha de entrega desde los ítems');
}


    // ✅ Buscar semana por fechaEntrega
    let semanaSel = semanasActivas.find(s =>
      fechaEntregaFinal.isBetween(
        dayjs(s.semana_inicio).startOf('day'),
        dayjs(s.semana_fin).endOf('day'),
        'day',
        '[]'
      )
    );

    // ✅ Si no coincide con ninguna semana, probar por semana_id de algún ítem
    if (!semanaSel) {
      const itemConSemana = items.find(i => i.semana_id);
      if (itemConSemana) {
        semanaSel = semanasActivas.find(s => s.id === itemConSemana.semana_id);
        console.log("📌 Semana detectada por item.semana_id:", semanaSel?.id);
      }
    }

    if (!semanaSel) {
      throw new Error(`No hay configuración para la semana del ${fechaEntrega}`);
    }

    // ✅ Si fechaEntrega no coincide con la semana seleccionada, corregirla
// ✅ Ajuste inteligente de fechaEntrega
const semanaInicio = dayjs(semanaSel.semana_inicio).tz(TZ).startOf('day');
const semanaFin = dayjs(semanaSel.semana_fin).tz(TZ).endOf('day');

// 📌 Caso 1: Si mandaron domingo (fechaEntrega < semana_inicio) → usar lunes
if (fechaEntregaFinal.isBefore(semanaInicio)) {
  fechaEntregaFinal = semanaInicio;
  console.log(`⚠️ FechaEntrega venía antes de la semana. Ajustada a lunes ${fechaEntregaFinal.format('YYYY-MM-DD')}`);
}

// 📌 Caso 2: Si mandan sábado o después de semana_fin → ajustar al último día (viernes)
if (fechaEntregaFinal.isAfter(semanaFin)) {
  fechaEntregaFinal = semanaFin;
  console.log(`⚠️ FechaEntrega venía después de la semana. Ajustada a viernes ${fechaEntregaFinal.format('YYYY-MM-DD')}`);
}

// 📌 Caso 3: Si está fuera y hay items con fecha, ajustar al día real de esos ítems
if (!fechaEntregaFinal.isBetween(semanaInicio, semanaFin, 'day', '[]')) {
  const itemConDia = items.find(i => i.dia);
  if (itemConDia) {
    const [, y, m, d] = itemConDia.dia.split('-'); // ej: jueves-2025-10-23
    fechaEntregaFinal = dayjs(`${y}-${m}-${d}`, 'YYYY-MM-DD').tz(TZ).startOf('day');
    console.log(`✅ FechaEntrega ajustada al primer item: ${fechaEntregaFinal.format('YYYY-MM-DD')}`);
  }
}


    // 📌 Convertir a Date real para DB
    const fechaEntregaDate = fechaEntregaFinal.toDate();

    // 📅 Calcular lunes de la semana
    const mondayOfWeek = dayjs(semanaSel.semana_inicio).tz(TZ).startOf('day');

    // 🥧 Detectar fecha de entrega de tartas
    let fechaEntregaTartas = null;
    for (const item of items || []) {
      if (item.item_type === 'tarta' && item.dia) {
        const partes = String(item.dia).split('-');
        if (partes.length === 4 && partes[0] === 'tartas') {
          const fechaTexto = `${partes[1]}-${partes[2]}-${partes[3]}`;
          const f = dayjs(fechaTexto, 'YYYY-MM-DD').tz(TZ).startOf('day');
          if (f.isValid()) {
            fechaEntregaTartas = f.hour(12).toDate();
            break;
          }
        }
      }
    }
    if (!fechaEntregaTartas && items.some(i => i.item_type === 'tarta')) {
      const viernes = mondayOfWeek.add(4, 'day');
      fechaEntregaTartas = viernes.hour(12).toDate();
    }

    // 🧹 Filtrar ítems según días habilitados
    const diasHabilitados = semanaSel.dias_habilitados || {};
    const itemsFiltrados = [];
    for (const item of items || []) {
      if (item.item_type === 'tarta') {
        itemsFiltrados.push(item);
        continue;
      }
      if (!item.dia) {
        itemsFiltrados.push(item);
        continue;
      }
      const diaTexto = item.dia.split('-')[0];
      const diaNorm = normalizeDia(diaTexto);
      if (!DIAS_VALIDOS.includes(diaNorm)) continue;
      if (!diasHabilitados[diaNorm]) continue;
      itemsFiltrados.push(item);
    }

    console.log(`✅ Items filtrados: ${itemsFiltrados.length} de ${items?.length || 0}`);

    // 🛒 Insertar orden
    const orderInsert = await client.query(`
      INSERT INTO orders (
        user_id, total, fecha_entrega, observaciones,
        metodo_pago, tipo_menu, comprobante_url, fecha_entrega_tartas
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [
      userId,
      total,
      fechaEntregaDate,
      observaciones || '',
      metodoPago || null,
      tipoMenu || 'usuario',
      comprobanteUrl || null,
      fechaEntregaTartas
    ]);

    const orderId = orderInsert.rows[0].id;

    // 🧾 Insertar ítems
    const itemsParaInsertar = itemsFiltrados.filter(item => {
      const tipo = String(item.item_type).toLowerCase();
      const qty = parseInt(item.quantity);
      return qty > 0 && ['daily', 'fijo', 'extra', 'tarta', 'especial', 'company'].includes(tipo);
    });

    for (const item of itemsParaInsertar) {
      let fechaDia = null;
      let diaFinal = null;
      const tipo = item.item_type.toLowerCase();

      if (item.dia) {
        const partes = item.dia.split('-');
        const diaTexto = partes[0];
        const diaNorm = normalizeDia(diaTexto);
        if (partes.length === 4) {
          const fechaTexto = `${partes[1]}-${partes[2]}-${partes[3]}`;
          const parsed = dayjs(fechaTexto, 'YYYY-MM-DD').tz(TZ);
          if (parsed.isValid()) fechaDia = parsed.startOf('day').toDate();
        }
        if (!fechaDia && DIAS_VALIDOS.includes(diaNorm)) {
          const index = DIAS_VALIDOS.indexOf(diaNorm);
          fechaDia = mondayOfWeek.add(index, 'day').toDate();
        }
        diaFinal = diaNorm;
      }

      await client.query(`
        INSERT INTO order_items (
          order_id, item_type, item_id, item_name,
          quantity, dia, precio_unitario, fecha_dia
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        orderId,
        tipo,
        tipo === 'tarta' ? null : parseInt(item.item_id),
        tipo === 'tarta' ? String(item.item_id) : String(item.item_name || `ID:${item.item_id}`),
        item.quantity,
        diaFinal,
        item.precio ?? null,
        fechaDia
      ]);
    }

    await client.query('COMMIT');
    console.log("🎉 Pedido creado exitosamente:", orderId);
    return { id: orderId, message: 'Pedido creado correctamente' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error createOrder:', err);
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
      LEFT JOIN menu_especiales ms ON ms.id = 
  CASE WHEN oi.item_type = 'especial' AND oi.item_id ~ '^[0-9]+$' THEN oi.item_id::int ELSE NULL END


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
    WHEN oi.item_type = 'fijo'  THEN mf.name
    WHEN oi.item_type = 'extra' THEN me.name
    WHEN oi.item_type = 'especial' THEN ms.name  -- ✅ agregado
    WHEN oi.item_type = 'tarta' THEN oi.item_id::text
    ELSE oi.item_id
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
if (['daily', 'fijo', 'especial', 'company'].includes(tipo)) {
  if (!pedido.diarios[dia]) pedido.diarios[dia] = {};
  pedido.diarios[dia][nombre] = (pedido.diarios[dia][nombre] || 0) + cantidad;
}

 else if (tipo === 'extra') {
        if (!pedido.extras[dia]) pedido.extras[dia] = {};
        pedido.extras[dia][nombre] = (pedido.extras[dia][nombre] || 0) + cantidad;
      }
    }
  });


  const fechaPorDia = {};
row.items.forEach(item => {
  if (item.dia && item.fecha_dia) {
    const fecha = dayjs(item.fecha_dia);
    if (fecha.isValid()) {
      const nombreDia = fecha.format('dddd'); // miércoles, jueves, etc.
      if (!fechaPorDia[nombreDia]) {
        fechaPorDia[nombreDia] = fecha.format('YYYY-MM-DD');
      }
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
    o.fecha_entrega_tartas,
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
        WHEN oi.item_type = 'fijo' AND oi.item_id ~ '^[0-9]+$' THEN mf.name
        WHEN oi.item_type = 'especial' AND oi.item_id ~ '^[0-9]+$' THEN ms.name
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
  LEFT JOIN menu_especiales ms ON ms.id = 
    CASE WHEN oi.item_type = 'especial' AND oi.item_id ~ '^[0-9]+$' THEN CAST(oi.item_id AS INTEGER) ELSE NULL END

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
  fecha_entrega_tartas: pedido.fecha_entrega_tartas, // ✅ esta es la línea que necesitás
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

  if (['daily', 'fijo', 'especial'].includes(tipo)) {

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







