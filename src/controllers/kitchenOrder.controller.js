import { createKitchenOrder } from '../models/kitchenOrder.model.js';

export const createKitchenOrderController = async (req, res) => {
  const { fecha_entrega, nombre_cliente, observaciones, items } = req.body;

  if (!fecha_entrega || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos del pedido' });
  }

  try {
    const order = await createKitchenOrder({
      fecha_entrega,
      nombre_cliente,
      observaciones,
      items
    });

    res.status(201).json({
      message: 'Pedido registrado con éxito',
      order
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar el pedido', details: err.message });
  }
};
