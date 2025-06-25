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
import { getLunesSemanaActual } from '../utils/date.utils.js';



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
  const { items, total, observaciones, metodoPago, fecha_entrega } = req.body;
  const userId = req.user.id;
  const tipo_menu = req.user.role || 'usuario';

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
const lunesSemana = getLunesSemanaActual().toISOString().slice(0, 10);
    const result = await pool.query('SELECT habilitado, cierre FROM menu_semana WHERE semana_inicio = $1', [lunesSemana]);
    const semana = result.rows[0];
    if (!semana?.habilitado) return res.status(400).json({ error: 'La semana no está habilitada' });
    if (semana.cierre && new Date(semana.cierre) < new Date()) {
      return res.status(400).json({ error: '⏰ El plazo ya cerró' });
    }

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
    o.tipo_menu,
    u.name AS usuario_nombre,
    up.apellido AS usuario_apellido,
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
  GROUP BY o.id, u.name, u.email, up.apellido, up.telefono, up.direccion_principal
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
  apellido: row.usuario_apellido, // 👈 asegurate que la uses
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
  const { id } = req.params;
  const { items } = req.body; // items es un array completo reemplazando los actuales

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items inválidos. Esperado array.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🚮 Borra los ítems anteriores de este pedido
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    // ➕ Inserta los nuevos ítems
    for (const item of items) {
      const { item_type, item_id, item_name, quantity, dia, precio_unitario } = item;

      await client.query(`
        INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        item_type,
        !isNaN(parseInt(item_id)) ? parseInt(item_id) : null,
        item_name,
        quantity,
        dia || null,
        precio_unitario || null
      ]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Ítems actualizados correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al actualizar ítems:', err);
    res.status(500).json({ error: 'Error al actualizar ítems', details: err.message });
  } finally {
    client.release();
  }
};
