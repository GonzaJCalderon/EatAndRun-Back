// src/utils/order.utils.js

export function agruparItemsPorTipo(items) {
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

export function parsePedido(row) {
  const pedido = {
    diarios: {},
    extras: {},
    tartas: {}
  };

  (row.items || []).forEach((item) => {
    const tipo = item.item_type;
const nombre = item.resolved_name || item.item_name || `ID:${item.item_id}` || 'Desconocido';

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
    metodoPago: row.metodo_pago || null,
    tipo_menu: row.tipo_menu || null,
    usuario: {
      nombre: `${row.nombre} ${row.apellido || ''}`.trim(),
      email: row.email,
      telefono: row.telefono || '',
      direccion: row.direccion_principal || '',
      direccionSecundaria: row.direccion_secundaria || ''
    },
    delivery: {
      nombre: row.delivery_name || null,
      telefono: row.delivery_phone || null
    },
    pedido
  };
}
