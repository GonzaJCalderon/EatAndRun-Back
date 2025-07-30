import { pool } from '../db/index.js';
import {
  getDailyMenuForRole,
  getAllDailyMenuItems,
  createDailyMenuItem,
  updateDailyMenuItem,
  deleteDailyMenuItem,
  getSpecialMenuForCompany
} from '../models/dailyMenu.model.js';

import { roleMap, roleReverseMap } from '../constants/roles.js';
import dayjs from '../utils/dayjs.js'; // Asegurate que tenga extendido utc + timezone


// 📥 Obtener menú del día según rol
// 📥 Obtener TODO el menú del día (para cualquier rol)
export const getDailyMenu = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM daily_menu ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener menú del día:', err);
    res.status(500).json({ error: 'Error interno al obtener el menú del día' });
  }
};


// 🔓 Obtener todos los platos (solo admin)
export const getAllDailyMenu = async (req, res) => {
  try {
    const items = await getAllDailyMenuItems();
    res.json(items);
  } catch (err) {
    console.error('❌ Error al obtener todos los platos:', err);
    res.status(500).json({ error: 'Error interno al obtener todos los platos' });
  }
};

// ✅ Crear plato del día
export const createDailyItem = async (req, res) => {
  const { name, description, date, for_role } = req.body;
  const imageUrl = req.file?.path;

  try {
    const item = await createDailyMenuItem({
      name,
      description,
      date,
      for_role,
      image_url: imageUrl
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('❌ Error al crear plato:', err);
    res.status(500).json({ error: 'No se pudo crear el plato' });
  }
};

// ✏️ Actualizar
export const updateDailyItem = async (req, res) => {
  const { id } = req.params;
  const { name, description, date, for_role, price } = req.body;
  const image_url = req.file?.path || null;

  try {
    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (price !== undefined) fieldsToUpdate.price = price;
    if (date !== undefined) fieldsToUpdate.date = date;
    if (for_role !== undefined) fieldsToUpdate.for_role = for_role;
    if (image_url) fieldsToUpdate.image_url = image_url;

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ error: '⚠️ No se enviaron campos para actualizar.' });
    }

    const updated = await updateDailyMenuItem(id, fieldsToUpdate);
    res.json(updated);
  } catch (err) {
    console.error('❌ Error al actualizar:', err);
    res.status(500).json({ error: 'No se pudo actualizar el plato' });
  }
};

// 🗑️ Eliminar
export const deleteDailyItem = async (req, res) => {
  const { id } = req.params;
  try {
    await deleteDailyMenuItem(id);
    res.json({ message: 'Plato eliminado' });
  } catch (err) {
    console.error('❌ Error al eliminar:', err);
    res.status(500).json({ error: 'No se pudo eliminar el plato' });
  }
};

// 🧾 Crear desde JSON sin imagen multer
export const createDailyItemFromJson = async (req, res) => {
  try {
    const { name, description, date, for_role, image_url } = req.body;

    if (!name || !date || !for_role || !image_url) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const item = await createDailyMenuItem({
      name,
      description,
      date,
      for_role,
      image_url
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('❌ Error al crear plato desde JSON:', err);
    res.status(500).json({ error: 'No se pudo crear el plato', details: err.message });
  }
};

export const saveWeeklyMenu = async (req, res) => {
  const { menu } = req.body;

  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({ error: 'Formato inválido del menú' });
  }

  const diasValidos = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
  const errores = [];
  const resultados = [];
  const yaInsertados = new Set(); // nombre+fecha para evitar duplicados

  try {
    for (const dia of diasValidos) {
      const platosDelDia = menu[dia] || [];
      const fecha = getFechaDeProximoDia(dia);

      for (const plato of platosDelDia) {
        const { nombre, descripcion, img } = plato;
        if (!nombre || !img) {
          errores.push({ dia, nombre, error: 'Faltan campos requeridos' });
          continue;
        }

        const key = `${nombre}-${fecha}`;
        if (yaInsertados.has(key)) {
          errores.push({ dia, nombre, error: 'Duplicado en menú del mismo día' });
          continue;
        }

        const item = await createDailyMenuItem({
          name: nombre,
          description: descripcion || '',
          date: fecha,
          image_url: img
        });

        if (item) {
          resultados.push(item);
          yaInsertados.add(key);
        }
      }
    }

    res.json({ message: 'Menú semanal guardado', guardados: resultados.length, errores });
  } catch (err) {
    console.error('❌ Error al guardar el menú semanal:', err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
};



// 🔍 Obtener menú del día actual según rol



export const getTodayDailyMenu = async (req, res) => {
  const today = new Date().toLocaleDateString('en-CA'); // ✅ CORREGIDO

  try {
    const result = await pool.query(
      'SELECT * FROM daily_menu WHERE date = $1 ORDER BY name ASC',
      [today]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener menú de hoy:', err);
    res.status(500).json({ error: 'Error interno al obtener menú de hoy' });
  }
};


// ✅ Obtener menú especial empresa (para empresa/admin)
export const getSpecialMenuEmpresa = async (req, res) => {
  try {
    const items = await getSpecialMenuForCompany();
    res.json(items);
  } catch (err) {
    console.error('❌ Error al obtener menú especial para empresa:', err);
    res.status(500).json({ error: 'Error al obtener menú especial para empresa' });
  }
};

// 🧩 Crear o actualizar menú especial para empresa
export const createOrUpdateSpecialMenu = async (req, res) => {
  try {
    const { name, description, price, date } = req.body;
    const role = 'empresa';
    const image_url = req.file?.path || null; // 👈 Guardar path si hay imagen

    await pool.query(
      `INSERT INTO special_company_menu (name, description, price, date, for_role, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (date, name) DO UPDATE SET
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         image_url = COALESCE(EXCLUDED.image_url, special_company_menu.image_url)`, // 👈 No pisa si no se envía nueva
      [name, description, price, date, role, image_url]
    );

    res.status(201).json({ message: 'Menú especial actualizado correctamente' });
  } catch (error) {
    console.error('Error al crear/actualizar menú especial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateSpecialMenuEmpresa = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, date } = req.body;
  const imageUrl = req.file?.path || null;

  try {
    // Construimos campos dinámicamente
    const fields = {
      name,
      description,
      price,
      date
    };

    if (imageUrl) fields.image_url = imageUrl;

    const keys = Object.keys(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(fields);

    const query = `
      UPDATE special_company_menu
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, [...values, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al actualizar menú especial:', err);
    res.status(500).json({ error: 'Error interno al actualizar el menú especial' });
  }
};




// 📅 Utilidad para obtener la fecha del próximo día
function getFechaDeProximoDia(dia) {
  const diasMap = {
    lunes: 1,
    martes: 2,
    miércoles: 3,
    jueves: 4,
    viernes: 5
  };

  const hoy = new Date();
  const diaActual = hoy.getDay(); // domingo = 0
  const diaObjetivo = diasMap[dia];

  if (diaObjetivo === undefined) {
    throw new Error(`Día inválido: ${dia}`);
  }

  let diferencia = (diaObjetivo - diaActual + 7) % 7;

  // ⚠️ Si hoy ya es ese día, devolvemos hoy mismo
  if (diferencia === 0) diferencia = 0;

  const fechaObjetivo = new Date(hoy);
  fechaObjetivo.setDate(hoy.getDate() + diferencia);
  return fechaObjetivo.toISOString().split('T')[0];
}


// ✅ GET menú agrupado por día: lunes a viernes
export const getWeeklyMenuGrouped = async (req, res) => {
  try {
    // Traer semana activa
    const semanaRes = await pool.query(`
      SELECT * FROM menu_semana
      WHERE habilitado = true
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (semanaRes.rowCount === 0) {
      return res.status(404).json({ error: 'No hay semana habilitada' });
    }

    const semana = semanaRes.rows[0];

    // Traer menú del día (platos diarios)
    const dailyRes = await pool.query(`
      SELECT * FROM daily_menu
      WHERE date BETWEEN $1 AND $2
    `, [semana.semana_inicio, semana.semana_fin]);

    // Traer menú especial empresa
    const specialRes = await pool.query(`
      SELECT * FROM special_company_menu
      WHERE date BETWEEN $1 AND $2
    `, [semana.semana_inicio, semana.semana_fin]);

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const resultado = {};

    for (const dia of dias) {
      resultado[dia] = {
        fijos: [],
        especiales: [],
        habilitado: semana.dias_habilitados?.[dia] ?? false
      };
    }

    // Mapear platos fijos
    for (const item of dailyRes.rows) {
const diaNombre = dayjs(item.date)
  .tz('America/Argentina/Buenos_Aires')
  .locale('es')
  .format('dddd')
  .toLowerCase();

      if (resultado[diaNombre]) {
        resultado[diaNombre].fijos.push(item);
      }
    }

    // Mapear platos especiales
    for (const item of specialRes.rows) {
  const diaNombre = dayjs(item.date)
    .tz('America/Argentina/Buenos_Aires')
    .locale('es')
    .format('dddd')
    .toLowerCase();

  console.log('🧪 MENÚ ESPECIAL:', item.date, '→', diaNombre); // <-- Esto aparece en consola

  if (resultado[diaNombre]) {
    resultado[diaNombre].especiales.push(item);
  }
}


    res.json(resultado);
  } catch (err) {
    console.error('❌ Error al armar menú agrupado:', err);
    res.status(500).json({ error: 'Error interno al armar menú agrupado' });
  }
};
