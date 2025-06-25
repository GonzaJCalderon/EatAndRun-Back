import { pool } from '../db/index.js';
import { createKitchenOrder, getItemsByDate  } from '../models/kitchenOrder.model.js';
import ExcelJS from 'exceljs';

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



export const exportProduccionSemanal = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Debes enviar ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD' });
    }

    const result = await pool.query(`
      SELECT 
        o.tipo_menu,
        o.fecha_entrega,
        o.observaciones,
        u.name AS usuario,
        json_agg(json_build_object(
          'item_type', oi.item_type,
          'item_id', oi.item_id,
          'quantity', oi.quantity,
          'dia', oi.dia,
          'item_name', 
            CASE 
              WHEN oi.item_type = 'daily' THEN dm.name
              WHEN oi.item_type = 'fijo' THEN fm.name
              WHEN oi.item_type = 'extra' THEN me.name
              WHEN oi.item_type = 'tarta' THEN oi.item_id
              ELSE NULL
            END
        )) AS items
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN daily_menu dm ON dm.id::text = oi.item_id
      LEFT JOIN fixed_menu fm ON fm.id::text = oi.item_id
      LEFT JOIN menu_extras me ON me.id::text = oi.item_id
      WHERE o.fecha_entrega BETWEEN $1 AND $2
      GROUP BY o.id, o.tipo_menu, u.name
      ORDER BY o.fecha_entrega ASC
    `, [desde, hasta]);

    const pedidos = result.rows;

    const workbook = new ExcelJS.Workbook();

    // Separamos por tipo_menu
    const agrupados = {
      usuario: [],
      empresa: []
    };

    pedidos.forEach(p => {
      if (agrupados[p.tipo_menu]) {
        agrupados[p.tipo_menu].push(p);
      }
    });

    // 👉 Procesamos cada tipo de menú (usuario y empresa)
    for (const tipo of ['usuario', 'empresa']) {
      const sheet = workbook.addWorksheet(tipo.toUpperCase());

      sheet.addRow([`📦 Producción semanal para: ${tipo.toUpperCase()}`]);
      sheet.addRow([]);

      const resumen = {
        diarios: {},
        extras: {},
        tartas: {},
        total: {},
        observaciones: []
      };

      agrupados[tipo].forEach(pedido => {
        pedido.items.forEach(i => {
          const cantidad = Number(i.quantity);
          if (isNaN(cantidad)) return;

          const nombre = i.item_name || i.item_id;
          const dia = i.dia || 'sin_dia';

          if (i.item_type === 'daily' || i.item_type === 'fijo') {
            if (!resumen.diarios[dia]) resumen.diarios[dia] = {};
            resumen.diarios[dia][nombre] = (resumen.diarios[dia][nombre] || 0) + cantidad;
            resumen.total[nombre] = (resumen.total[nombre] || 0) + cantidad;
          } else if (i.item_type === 'extra') {
            if (!resumen.extras[dia]) resumen.extras[dia] = {};
            resumen.extras[dia][nombre] = (resumen.extras[dia][nombre] || 0) + cantidad;
            resumen.total[nombre] = (resumen.total[nombre] || 0) + cantidad;
          } else if (i.item_type === 'tarta') {
            resumen.tartas[nombre] = (resumen.tartas[nombre] || 0) + cantidad;
            resumen.total[nombre] = (resumen.total[nombre] || 0) + cantidad;
          }
        });

        if (pedido.observaciones) {
          resumen.observaciones.push(`• ${pedido.usuario}: ${pedido.observaciones}`);
        }
      });

      // 🔹 Sección Diarios
      sheet.addRow(['📅 DIARIOS']);
      Object.entries(resumen.diarios).forEach(([dia, platos]) => {
        Object.entries(platos).forEach(([nombre, cantidad]) => {
          sheet.addRow([`🍴 ${dia}`, nombre, cantidad]);
        });
      });

      sheet.addRow([]);
      sheet.addRow(['📅 EXTRAS']);
      Object.entries(resumen.extras).forEach(([dia, extras]) => {
        Object.entries(extras).forEach(([nombre, cantidad]) => {
          sheet.addRow([`🍴 ${dia}`, nombre, cantidad]);
        });
      });

      sheet.addRow([]);
      sheet.addRow(['📅 TARTAS']);
      Object.entries(resumen.tartas).forEach(([nombre, cantidad]) => {
        sheet.addRow([`🍴 ${nombre}`, cantidad]);
      });

      sheet.addRow([]);
      sheet.addRow(['📦 Total Producción Semanal']);
      Object.entries(resumen.total).forEach(([nombre, cantidad]) => {
        sheet.addRow([`🍽️ ${nombre}`, cantidad]);
      });

      sheet.addRow([]);
      sheet.addRow(['✏️ Observaciones']);
      resumen.observaciones.forEach(o => {
        sheet.addRow([o]);
      });

      sheet.columns.forEach(column => {
        column.width = 30;
      });

      sheet.getRow(1).font = { bold: true };
    }

    // 🎯 Preparar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=produccion-semanal.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Error al exportar producción:', err);
    res.status(500).json({ error: 'Error al exportar producción', details: err.message });
  }
};

