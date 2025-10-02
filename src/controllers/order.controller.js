import { pool } from '../db/index.js';
import {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  getOrderStatusHistory,
  saveOrderComprobante,
 getPedidoConItemsById, 
 getPedidosConItems 
} from '../models/order.model.js';
import { cloudinary } from '../utils/cloudinary.js'; // Si estás usando Cloudinary en uploads
import { getLunesSemanaActual } from '../utils/date.utils.js';
import { getConfig } from '../models/config.model.js';
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const TZ = 'America/Argentina/Buenos_Aires';




// ✅ Controlador para generar URL firmada de Cloudinary
// controllers/order.controller.js

export const getSignedComprobanteUrlController = async (req, res) => {
  const { public_id } = req.query;

  if (!public_id) {
    return res.status(400).json({ error: 'Falta el public_id del comprobante' });
  }

  try {
    const url = cloudinary.url(public_id, {
      type: 'authenticated',         // 🔒 acceso protegido
      resource_type: 'image',        // ✅ ya no usás PDFs
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60
    });

    res.json({ signedUrl: url });
  } catch (err) {
    console.error('❌ Error generando URL firmada:', err);
    res.status(500).json({ error: 'No se pudo generar la URL firmada' });
  }
};


export const createOrderController = async (req, res) => {
  const { items, observaciones, metodoPago, fecha_entrega } = req.body;
  const userId = req.user.id;
  const tipo_menu = req.user.role || 'usuario';

  // 🛡️ Validaciones básicas
  if (!items?.length) return res.status(400).json({ error: 'Items inválidos o vacíos' });
  if (!fecha_entrega) return res.status(400).json({ error: 'Falta la fecha de entrega' });

  for (const i of items) {
    if (!i.item_type || typeof i.quantity === 'undefined') {
      return res.status(400).json({ error: 'Item malformado', item: i });
    }
    if (['daily','fijo','extra'].includes(i.item_type) && (!i.dia || !i.item_id)) {
      return res.status(400).json({ error: 'Falta día o item_id en item', item: i });
    }
    if (i.item_type === 'extra' && isNaN(parseInt(i.item_id))) {
      return res.status(400).json({ error: 'Item extra con ID no numérico', item: i });
    }
    if (i.item_type === 'tarta' && !i.item_id) {
      return res.status(400).json({ error: 'Tarta sin item_id', item: i });
    }
  }

  try {
    // 🗓️ Validar semana activa
 
    // ✅ Línea corregida
const getLunesFromFecha = (fecha) => {
  const fechaDayjs = dayjs(fecha).tz('America/Argentina/Buenos_Aires');
  const dayOfWeek = fechaDayjs.day();
  const lunes = dayOfWeek === 0 
    ? fechaDayjs.subtract(6, 'day')
    : fechaDayjs.subtract(dayOfWeek - 1, 'day');
  return lunes.format('YYYY-MM-DD');
};

const lunesSemana = getLunesFromFecha(fecha_entrega);
    const result = await pool.query(
  'SELECT habilitado, cierre FROM menu_semana WHERE semana_inicio = $1',
  [lunesSemana]
);
const semana = result.rows[0];

// Agregar esta validación
if (!semana) {
  return res.status(400).json({ 
    error: `No hay configuración para la semana del ${lunesSemana}. Contacta al administrador.`,
    fecha_entrega,
    semana_calculada: lunesSemana
  });
}

if (!semana.habilitado) return res.status(400).json({ error: 'La semana no está habilitada' });

    // ✅ Obtener precios actualizados
    const precios = await getConfig('precios');
    if (!precios) return res.status(500).json({ error: 'No se pudo obtener configuración de precios' });

    // 💸 Calcular total
    let total = 0;
    let totalPlatos = 0;
    const diasConPlato = new Set();

    for (const item of items) {
      const cantidad = parseInt(item.quantity) || 0;

      switch (item.item_type) {
        case 'daily':
        case 'fijo':
          totalPlatos += cantidad;
          total += cantidad * precios.plato;
          diasConPlato.add(item.dia);
          break;

        case 'extra':
          const precioExtra = {
            1: precios.postre,
            2: precios.ensalada,
            3: precios.proteina
          }[item.item_id];

          if (precioExtra) {
            total += cantidad * precioExtra;
          }
          break;

       case 'tarta': {
  const tartaRes = await pool.query('SELECT precio FROM tartas WHERE key = $1 OR nombre = $1 LIMIT 1', [item.item_id]);
  const tarta = tartaRes.rows[0];
  if (!tarta) throw new Error(`Tarta '${item.item_id}' no encontrada`);

  total += cantidad * tarta.precio;
  break;
}


        case 'skip':
          break;

        default:
          console.warn('⚠️ Tipo de item desconocido:', item.item_type);
      }
    }

    // 🚚 Sumar envío por día con plato
    total += diasConPlato.size * precios.envio;

    // 🎉 Descuento si supera umbral
    if (totalPlatos >= precios.umbral_descuento) {
      total -= totalPlatos * precios.descuento_por_plato;
    }

    // 🧾 Crear pedido
    const order = await createOrder(userId, items, total, {
      fechaEntrega: fecha_entrega,
      observaciones,
      metodoPago,
      tipoMenu: tipo_menu,
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Error al crear pedido:', err);
    res.status(500).json({ error: 'Error al crear el pedido', details: err.message });
  }
};









// Obtener pedidos del usuario actual
export const getUserOrdersController = async (req, res) => {
  try {
    const pedidos = await getPedidosConItems('WHERE o.user_id = $1', [req.user.id]);
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos del usuario', details: err.message });
  }
};

function calcularFechaEntregaDesdeDia(diaTexto, fechaEntrega) {
  if (!diaTexto || diaTexto === 'sin_dia' || diaTexto === 'tartas') return null;

  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const fechaBase = new Date(fechaEntrega);
  const numeroDia = diasSemana.indexOf(diaTexto.toLowerCase());

  if (numeroDia === -1) return null;

  const offset = numeroDia - fechaBase.getDay();
  const fechaFinal = new Date(fechaBase);
  fechaFinal.setDate(fechaBase.getDate() + offset);
  fechaFinal.setHours(0, 0, 0, 0);
  return fechaFinal.toISOString(); // o .toLocaleDateString(...) si querés más legible
}


// Obtener todos los pedidos (admin/moderador)



export const getAllOrdersController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        o.tipo_menu,
        u.name AS usuario_nombre,
        COALESCE(up.apellido, u.last_name) AS usuario_apellido, -- 👈 acá
        u.email,
        up.telefono,
        up.direccion_principal,
        json_agg(json_build_object(
          'item_type', oi.item_type,
          'item_id', oi.item_id,
          'item_name', oi.item_name,
          'quantity', oi.quantity,
          'dia', oi.dia
        )) AS items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, u.name, u.email, up.apellido, up.telefono, up.direccion_principal, u.last_name
      ORDER BY o.created_at DESC
    `);

    const pedidos = result.rows.map((row) => {
      const pedido = { diarios: {}, extras: {}, tartas: {} };

      (row.items || []).forEach((item) => {
        const tipo = item.item_type;
        const nombre = item.item_name;
        if (!nombre) return;

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
        tipo_menu: row.tipo_menu,
        usuario: {
          nombre: row.usuario_nombre,
          apellido: row.usuario_apellido || '', // 👈 ahora siempre llega
          email: row.email,
          telefono: row.telefono,
          direccion: row.direccion_principal,
        },
        estado: row.status,
        fecha: row.fecha_entrega,
        fecha_legible: row.fecha_entrega 
          ? dayjs(row.fecha_entrega).tz(TZ).format('dddd DD/MM/YYYY') 
          : null, // 👈 fecha bonita
        observaciones: row.observaciones,
        comprobanteUrl: row.comprobante_url,
        comprobanteNombre: row.comprobante_nombre,
        nota_admin: row.nota_admin,
        pedido
      };
    });

    res.json(pedidos);
  } catch (err) {
    console.error('❌ Error al obtener pedidos completos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos completos', details: err.message });
  }
};




// Actualizar estado del pedido
export const updateOrderStatusController = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

 const validStatuses = ['pendiente', 'preparando', 'en camino', 'entregado', 'cancelado'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const updated = await updateOrderStatus(id, status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el estado', details: err.message });
  }
};



// Historial de estados del pedido
export const getOrderTrackingController = async (req, res) => {
  const { id } = req.params;

  try {
    const history = await getOrderStatusHistory(id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el historial', details: err.message });
  }
};

// Subida de comprobante de pago
export const uploadComprobanteController = async (req, res) => {
  const { id } = req.params;
  const { comprobanteUrl } = req.body;

  if (!comprobanteUrl) {
    return res.status(400).json({ error: 'URL de comprobante no proporcionada' });
  }

  try {
    const updated = await saveOrderComprobante(id, comprobanteUrl);
    res.json({ message: 'Comprobante guardado', pedido: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar comprobante' });
  }
};

export const createOrderWithUploadController = async (req, res) => {
  const { items, total, fecha_entrega, observaciones } = req.body;
  const userId = req.user.id;

  if (!items || !fecha_entrega || !total) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  let itemsParsed;
  try {
    itemsParsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(itemsParsed)) throw new Error('Items debe ser un array');
  } catch (err) {
    return res.status(400).json({ error: 'Formato inválido de items', details: err.message });
  }

  try {
    let comprobanteUrl = null;

    // ✅ CloudinaryStorage ya subió el archivo. Usamos el resultado:
    if (req.file && req.file.path) {
      comprobanteUrl = req.file.path; // .path ya es el secure_url en CloudinaryStorage
    }

    const pedido = await createOrder(userId, itemsParsed, total, {
      fechaEntrega: fecha_entrega,
      observaciones,
      comprobanteUrl
    });

    res.status(201).json({ message: 'Pedido creado con comprobante', pedido });
  } catch (err) {
    if (err.message.includes('Solo se permiten archivos')) {
      return res.status(400).json({ error: 'Solo se permiten imágenes JPG o PNG como comprobante' });
    }

    console.error('❌ Error al crear pedido con comprobante:', err);
    res.status(500).json({ error: 'No se pudo crear el pedido', details: err.message });
  }
};




export const getOrderByIdController = async (req, res) => {
  const { id } = req.params;

  try {
    const pedido = await getPedidoConItemsById(id);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(pedido);
  } catch (err) {
    console.error('❌ Error al obtener pedido:', err);
    res.status(500).json({ error: 'Error al obtener pedido', details: err.message });
  }
};



export const updatePedidoFields = async (req, res) => {
  const { id } = req.params;
  const { observaciones, extras } = req.body;

  try {
    await pool.query(
      'UPDATE pedidos SET observaciones = $1, extras_text = $2 WHERE id = $3',
      [observaciones, extras, id]
    );
    res.json({ message: 'Actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar pedido:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};


export const updateOrderItemsController = async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('🔎 req.params:', req.params); 
    const orderId = parseInt(req.params.id, 10);
    console.log('🔎 orderId calculado:', orderId);

    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Formato inválido de items' });
    }

    await client.query('BEGIN');

    // 🔠 Normalizador de día
    const normalizeDia = (d = '') =>
      String(d)
        .split(' ')[0]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    // 📅 Traer orden
    const { rows: [order] } = await client.query(
      'SELECT fecha_entrega FROM orders WHERE id = $1',
      [orderId]
    );
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Orden ${orderId} no encontrada` });
    }

    const fechaEntrega = dayjs(order.fecha_entrega).tz('America/Argentina/Buenos_Aires');

    // 🗓️ Calcular fecha_dia
    const calcularFechaDia = (diaTexto) => {
      const d = normalizeDia(diaTexto);
      const idx = diasValidos.indexOf(d);
      if (idx === -1) return null;
      const lunes = fechaEntrega.startOf('week').add(1, 'day'); 
      return lunes.add(idx, 'day').startOf('day').toDate();
    };

    // 📥 Items actuales
    const { rows: existentes } = await client.query(
      'SELECT id, item_type, item_id, quantity, dia FROM order_items WHERE order_id = $1',
      [orderId]
    );

    const keyOf = (t, id) => `${t}-${String(id)}`;
    const mapaExistentes = new Map(existentes.map(e => [keyOf(e.item_type, e.item_id), e]));

    let updated = 0, inserted = 0, deleted = 0;

    // 🔄 Upsert
    for (const it of items) {
      const { item_type, item_id, item_name, quantity, dia, precio_unitario } = it ?? {};
      if (!item_type || item_id == null || dia == null || quantity == null) continue;

      const diaNorm = normalizeDia(dia);
      const fecha_dia = calcularFechaDia(diaNorm);
      if (!fecha_dia) continue;

      const k = keyOf(item_type, item_id);
      const existente = mapaExistentes.get(k);

      if (existente) {
        // ✅ Comparar con Number()
        const cambioCantidad = Number(existente.quantity) !== Number(quantity);
        const cambioDia = normalizeDia(existente.dia || '') !== diaNorm;

        if (cambioCantidad || cambioDia) {
          await client.query(
            `UPDATE order_items
             SET quantity = $1,
                 dia = $2,
                 fecha_dia = $3,
                 item_name = COALESCE($4, item_name),
                 precio_unitario = COALESCE($5, precio_unitario)
             WHERE id = $6`,
            [Number(quantity), diaNorm, fecha_dia, item_name ?? null, precio_unitario ?? null, existente.id]
          );
          updated++;
        }

        mapaExistentes.delete(k);
      } else {
        // 🆕 Insertar
        await client.query(
          `INSERT INTO order_items
             (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario, fecha_dia)
           VALUES ($1,       $2,        $3,      $4,        $5,      $6,   $7,              $8)`,
          [
            orderId,
            item_type,
            item_id,
            item_name ?? `ID:${item_id}`,
            Number(quantity),
            diaNorm,
            precio_unitario ?? null,
            fecha_dia
          ]
        );
        inserted++;
      }
    }

    // 🗑️ Eliminar los que no vinieron
    for (const restante of mapaExistentes.values()) {
      await client.query('DELETE FROM order_items WHERE id = $1', [restante.id]);
      deleted++;
    }

    await client.query('COMMIT');

    console.log('✅ Resumen update-items:', { orderId, updated, inserted, deleted });
    return res.json({ success: true, resumen: { updated, inserted, deleted } });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en updateOrderItemsController:', error);
    return res.status(500).json({ error: 'Error actualizando los items', details: error.message });
  } finally {
    client.release();
  }
};










 const calcularTotalPedido = async (items) => {
  const precios = await getConfig('precios');
  if (!precios) throw new Error('❌ No hay configuración de precios');

  let total = 0;
  let totalPlatos = 0;
  let diasConPlato = new Set();

  for (const item of items) {
    const cantidad = parseInt(item.quantity) || 0;

    switch (item.item_type) {
      case 'daily':
      case 'fijo':
        totalPlatos += cantidad;
        total += cantidad * precios.plato;
        diasConPlato.add(item.dia);
        break;

      case 'extra':
        // el precio debe venir del ID o hardcodearlo (opcional)
        const precioExtra = {
          1: precios.postre,
          2: precios.ensalada,
          3: precios.proteina
        }[item.item_id];

        if (precioExtra) {
          total += cantidad * precioExtra;
        }
        break;

      case 'tarta':
        total += cantidad * precios.tarta;
        break;

      case 'skip':
        // no suma nada
        break;

      default:
        console.warn('⚠️ Tipo de item desconocido:', item);
    }
  }

  // Sumar envío por cada día con plato
  total += diasConPlato.size * precios.envio;

  // Descuento si supera el umbral
  if (totalPlatos >= precios.umbral_descuento) {
    total -= totalPlatos * precios.descuento_por_plato;
  }

  return total;
};



