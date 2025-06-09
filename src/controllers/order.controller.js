import { pool } from '../db/index.js';
import {
  createOrder,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatus,
  getOrderStatusHistory,
  saveOrderComprobante
} from '../models/order.model.js';
import { cloudinary } from '../utils/cloudinary.js'; // Si estás usando Cloudinary en uploads
import { getLunesProximaSemana } from '../utils/date.utils.js'



export const createOrderController = async (req, res) => {
  const { items, total, fecha_entrega, observaciones } = req.body;
  const userId = req.user.id;

  // 🔐 Validación base
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items inválidos o vacíos' });
  }

  if (!fecha_entrega) {
    return res.status(400).json({ error: 'Falta la fecha de entrega' });
  }

  // 🔎 Validación detallada de cada item
  for (const i of items) {
    if (!i.item_type || typeof i.quantity === 'undefined') {
      return res.status(400).json({ error: 'Item malformado', item: i });
    }

    if (['daily', 'fijo', 'extra'].includes(i.item_type)) {
      if (!i.dia) {
        return res.status(400).json({ error: 'Falta día en item', item: i });
      }

      if (!i.item_id) {
        return res.status(400).json({ error: 'Falta item_id en item', item: i });
      }

      if (i.item_type === 'extra' && isNaN(parseInt(i.item_id))) {
        return res.status(400).json({ error: 'Item extra con ID no numérico', item: i });
      }
    }

    if (i.item_type === 'tarta') {
      if (!i.item_id) {
        return res.status(400).json({ error: 'Tarta sin item_id', item: i });
      }
    }

    if (i.item_type === 'skip') {
      if (!i.dia) {
        return res.status(400).json({ error: 'Skip sin día', item: i });
      }
    }
  }

  try {
    // 🔄 Validar semana activa
    const lunesSemana = getLunesProximaSemana().toISOString().slice(0, 10);
    const result = await pool.query(
      'SELECT * FROM menu_semana WHERE semana_inicio = $1',
      [lunesSemana]
    );
    const semana = result.rows[0];

    if (!semana || !semana.habilitado) {
      return res.status(400).json({ error: 'La semana no está habilitada para pedidos' });
    }

    if (semana.cierre && new Date(semana.cierre) < new Date()) {
      return res.status(400).json({ error: '⏰ El plazo para hacer pedidos ya cerró' });
    }

    // 💾 Guardar pedido en DB
    const order = await createOrder(userId, items, total, {
      fechaEntrega: fecha_entrega,
      observaciones
    });

    console.log('✅ Pedido creado correctamente:', order);

    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Error al crear pedido:', err);
    res.status(500).json({ error: 'Error al crear el pedido', details: err.message });
  }
};



// Obtener pedidos del usuario actual
export const getUserOrdersController = async (req, res) => {
  try {
    const orders = await getOrdersByUser(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos del usuario' });
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
      GROUP BY o.id, u.name, u.email, up.telefono, up.direccion_principal
      ORDER BY o.created_at DESC
    `);

    const pedidos = result.rows.map((row) => {
      const pedido = {
        diarios: {},
        extras: {},
        tartas: {}
      };

      row.items.forEach((item) => {
        const tipo = item.item_type;
        const nombre = item.item_name || item.item_id;
        const dia = item.dia || 'sin_dia';

        // 🔐 Aseguramos que cantidad siempre sea un número
        const cantidad = Number(item.quantity);
        if (isNaN(cantidad)) return; // si no es número, lo descartamos

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
          // ⚠️ Se eliminó 'subdireccion' porque daba error de columna
        },
        estado: row.status,
        fecha: row.fecha_entrega,
        observaciones: row.observaciones,
        comprobanteUrl: row.comprobante_url,
        comprobanteNombre: row.comprobante_nombre,
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

// Crear pedido con subida de imagen
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
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'eat-and-run/comprobantes',
        use_filename: true,
        unique_filename: true
      });
      comprobanteUrl = uploadResult.secure_url;
    }

    const pedido = await createOrder(userId, itemsParsed, total, {
      fechaEntrega: fecha_entrega,
      observaciones,
      comprobanteUrl
    });

    res.status(201).json({ message: 'Pedido creado con comprobante', pedido });
  } catch (err) {
    console.error('❌ Error al crear pedido con comprobante:', err);
    res.status(500).json({ error: 'No se pudo crear el pedido', details: err.message });
  }
};


export const getOrderByIdController = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT o.*, u.name AS usuario_nombre, u.email, up.telefono, up.direccion_principal
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener pedido:', err);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
};


