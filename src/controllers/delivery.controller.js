import { pool } from '../db/index.js';
import {
  assignOrderToDelivery,
  getOrdersByDelivery,
  updateOrderStatus,
  getUnassignedOrdersFromDB,
  getPedidosConItems,
  getAllOrders as getAllOrdersFromDB
} from '../models/order.model.js';



export const assignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_id } = req.body;

    if (!delivery_id) {
      return res.status(400).json({ error: 'Se requiere delivery_id' });
    }

    await assignOrderToDelivery(id, delivery_id);

    const [pedido] = await getPedidosConItems(`WHERE o.id = $1`, [id]);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado después de asignar' });
    }

    res.json({ message: 'Pedido asignado al repartidor', pedido });
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar pedido', details: err.message });
  }
};


export const getMyDeliveries = async (req, res) => {
  try {
    const deliveryId = req.user.id;

    const { desde, hasta } = req.query;
    let filtros = `WHERE o.delivery_id = $1`;
    const valores = [deliveryId];

    if (desde && hasta) {
      filtros += ` AND o.fecha_entrega BETWEEN $2 AND $3`;
      valores.push(desde, hasta);
    }

    const pedidos = await getPedidosConItems(filtros, valores);
    res.json(pedidos);
  } catch (err) {
    console.error('❌ Error al obtener pedidos del repartidor:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};





export const markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateOrderStatus(id, 'entregado');
    res.json({ message: 'Pedido marcado como entregado', pedido: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar pedido como entregado', details: err.message });
  }
};


export const getUnassignedOrders = async (req, res) => {
  try {
    const pedidos = await getPedidosConItems(`
      WHERE o.status = 'pendiente' AND o.assigned_to IS NULL
    `);
    res.json(pedidos);
  } catch (err) {
    console.error('❌ Error al obtener pedidos sin asignar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};





export const selfAssignOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryId = req.user.id;

    await assignOrderToDelivery(id, deliveryId);

    const [pedido] = await getPedidosConItems(`WHERE o.id = $1`, [id]);

    res.json({ message: 'Pedido autoasignado correctamente', pedido });
  } catch (err) {
    res.status(500).json({ error: 'Error al autoasignar el pedido', details: err.message });
  }
};


export const getAllOrders = async (req, res) => {
  try {
    const pedidos = await getPedidosConItems(); // sin filtro
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener todos los pedidos', details: err.message });
  }
};


export const updateDeliveryOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, motivo } = req.body;

  try {
    const pedido = await updateOrderStatus(id, status);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Si es "no_entregado", guardar el motivo
    if (status === 'no_entregado' && motivo) {
      const client = await pool.connect();
      try {
        await client.query(
          'UPDATE orders SET motivo_no_entregado = $1 WHERE id = $2',
          [motivo, id]
        );
      } finally {
        client.release();
      }
    }

    res.json({ message: `Estado del pedido actualizado a ${status}`, pedido });
  } catch (err) {
    console.error('❌ Error actualizando estado del pedido:', err);
    res.status(500).json({ message: 'Error al actualizar el estado' });
  }
};


export const getDeliveryHistory = async (req, res) => {
  try {
    const deliveryId = req.user.id;

    const pedidosEntregados = await getPedidosConItems(
      `WHERE o.delivery_id = $1 AND o.status = 'entregado'`,
      [deliveryId]
    );

    res.json(pedidosEntregados);
  } catch (err) {
    console.error('❌ Error al obtener historial de entregas:', err);
    res.status(500).json({ error: 'Error al obtener historial de entregas' });
  }
};

export const markAsNotDelivered = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json({ error: 'Se requiere un motivo válido (mín. 5 caracteres)' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Cambiar estado del pedido
      const pedidoUpdate = await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        ['no_entregado', id]
      );

      // 2. Guardar historial
      await client.query(
        'INSERT INTO order_status_history (order_id, status, motivo) VALUES ($1, $2, $3)',
        [id, 'no_entregado', motivo]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Pedido marcado como no entregado',
        pedido: pedidoUpdate.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error al marcar como no entregado:', err);
    res.status(500).json({ error: 'Error al registrar el pedido como no entregado' });
  }
};
