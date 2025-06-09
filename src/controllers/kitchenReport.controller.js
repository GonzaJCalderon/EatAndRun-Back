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
