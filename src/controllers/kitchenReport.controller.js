import { getItemsByDate } from '../models/kitchenOrder.model.js';
import ExcelJS from 'exceljs';

export const exportKitchenExcel = async (req, res) => {
  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Falta la fecha (?fecha=YYYY-MM-DD)' });
  }

  const items = await getItemsByDate(fecha);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumen Cocina');

  worksheet.columns = [
    { header: 'Categoría', key: 'categoria', width: 20 },
    { header: 'Item', key: 'nombre_item', width: 40 },
    { header: 'Cantidad total', key: 'total', width: 20 }
  ];

  items.forEach((item) => {
    worksheet.addRow({
      categoria: item.categoria,
      nombre_item: item.nombre_item,
      total: item.total
    });
  });

  // Estilos básicos
  worksheet.getRow(1).font = { bold: true };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=resumen-cocina-${fecha}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
};



export const exportProduccionSemanal = async (req, res) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Faltan parámetros ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD' });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        o.tipo_menu,
        o.observaciones,
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN daily_menu dm ON dm.id = 
        CASE WHEN oi.item_type = 'daily' THEN oi.item_id::INTEGER ELSE NULL END
      LEFT JOIN fixed_menu fm ON fm.id = 
        CASE WHEN oi.item_type = 'fijo' THEN oi.item_id::INTEGER ELSE NULL END
      LEFT JOIN menu_extras me ON me.id = 
        CASE WHEN oi.item_type = 'extra' THEN oi.item_id::INTEGER ELSE NULL END
      WHERE o.fecha_entrega BETWEEN $1 AND $2
      GROUP BY o.id
    `,
      [desde, hasta]
    );

    const pedidos = result.rows;

    // 🔄 Agrupamos por tipo_menu
    const agrupados = { usuario: [], empresa: [] };
    for (const pedido of pedidos) {
      const tipo = pedido.tipo_menu === 'empresa' ? 'empresa' : 'usuario';
      agrupados[tipo].push(pedido);
    }

    const workbook = new ExcelJS.Workbook();

    for (const tipoMenu of ['usuario', 'empresa']) {
      const hoja = workbook.addWorksheet(tipoMenu.toUpperCase());

      const diarios = {};
      const extras = {};
      const tartas = {};
      const total = {};
      const observaciones = [];

      agrupados[tipoMenu].forEach((pedido) => {
        if (pedido.observaciones) {
          observaciones.push(`• ${pedido.observaciones}`);
        }

        pedido.items.forEach((item) => {
          const dia = item.dia || 'sin_dia';
          const tipo = item.item_type;
          const nombre = item.item_name || item.item_id;
          const cantidad = parseInt(item.quantity);

          if (isNaN(cantidad)) return;

          if (tipo === 'daily' || tipo === 'fijo') {
            if (!diarios[dia]) diarios[dia] = {};
            diarios[dia][nombre] = (diarios[dia][nombre] || 0) + cantidad;
            total[dia] = (total[dia] || 0) + cantidad;
          }

          if (tipo === 'extra') {
            if (!extras[dia]) extras[dia] = {};
            extras[dia][nombre] = (extras[dia][nombre] || 0) + cantidad;
            total[dia] = (total[dia] || 0) + cantidad;
          }

          if (tipo === 'tarta') {
            tartas[nombre] = (tartas[nombre] || 0) + cantidad;
            total[nombre] = (total[nombre] || 0) + cantidad;
          }
        });
      });

      // ✨ DIARIOS
      hoja.addRow([`📅 DIARIOS`]);
      Object.keys(diarios).sort().forEach((dia) => {
        hoja.addRow([`🍴 ${dia}`]);
        for (const comida in diarios[dia]) {
          hoja.addRow([comida, diarios[dia][comida]]);
        }
        hoja.addRow([]);
      });

      // ✨ EXTRAS
      hoja.addRow([`📅 EXTRAS`]);
      Object.keys(extras).sort().forEach((dia) => {
        hoja.addRow([`🍴 ${dia}`]);
        for (const extra in extras[dia]) {
          hoja.addRow([extra, extras[dia][extra]]);
        }
        hoja.addRow([]);
      });

      // ✨ TARTAS
      hoja.addRow([`📅 TARTAS`]);
      for (const tarta in tartas) {
        hoja.addRow([`🍴 ${tarta}`, tartas[tarta]]);
      }
      hoja.addRow([]);

      // ✨ TOTAL SEMANAL
      hoja.addRow([`📦 Total Producción Semanal`]);
      for (const key in total) {
        hoja.addRow([`🍽️ ${key}`, total[key]]);
      }
      hoja.addRow([]);

      // ✨ Observaciones
      hoja.addRow([`✏️ Observaciones:`]);
      observaciones.forEach(obs => hoja.addRow([obs]));
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=produccion_semanal_${desde}_a_${hasta}.xlsx`
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Error en exportProduccionSemanal:', err);
    res.status(500).json({ error: 'No se pudo generar el Excel', details: err.message });
  }
};
