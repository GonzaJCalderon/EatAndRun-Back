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

// 📥 Obtener menú del día según rol
export const getDailyMenu = async (req, res) => {
const roleName = req.user?.role; // ✅ ahora sí: "admin", "empresa", etc.


  if (!roleName) {
    return res.status(403).json({ error: 'Rol no autorizado para ver menú del día' });
  }

  try {
    const items = await getDailyMenuForRole(roleName === 'admin' ? 'usuario' : roleName);
    res.json(items);
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

// 📆 Guardar menú semanal para usuario
export const saveWeeklyUserMenu = async (req, res) => {
  const { menu } = req.body;
  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({ error: 'Formato inválido del menú' });
  }

  const diasValidos = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
  const errores = [];
  const resultados = [];

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

        const item = await createDailyMenuItem({
          name: nombre,
          description: descripcion || '',
          date: fecha,
          for_role: 'usuario',
          image_url: img
        });

        resultados.push(item);
      }
    }

    res.json({ message: 'Menú semanal guardado', guardados: resultados.length, errores });
  } catch (err) {
    console.error('❌ Error al guardar el menú semanal:', err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
};

// 📆 Guardar menú semanal para empresa
export const saveWeeklyCompanyMenu = async (req, res) => {
  const { menu } = req.body;
  if (!menu || typeof menu !== 'object') {
    return res.status(400).json({ error: 'Formato inválido del menú' });
  }

  const diasValidos = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
  const errores = [];
  const resultados = [];

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

        const item = await createDailyMenuItem({
          name: nombre,
          description: descripcion || '',
          date: fecha,
          for_role: 'empresa',
          image_url: img
        });

        resultados.push(item);
      }
    }

    res.json({ message: 'Menú empresa guardado', guardados: resultados.length, errores });
  } catch (err) {
    console.error('❌ Error al guardar el menú empresa:', err);
    res.status(500).json({ error: 'Error interno', details: err.message });
  }
};

// 🔍 Obtener menú del día actual según rol



export const getTodayDailyMenu = async (req, res) => {
  let rawRole = req.user?.role;

  // Si el role ya es string (ej: 'delivery'), usalo directo
  // Si es un número (ej: 3), lo convertimos con roleMap
  const roleName = typeof rawRole === 'string'
    ? rawRole
    : roleMap[rawRole];

  console.log('🧾 [Menu] Raw role:', rawRole, '→ Resolved:', roleName);

  if (!roleName) {
    return res.status(403).json({ error: 'Rol no autorizado' });
  }

  // delivery y admin ven menú de usuario
  const effectiveRole = ['admin', 'delivery'].includes(roleName)
    ? 'usuario'
    : roleName;

  const today = new Date().toISOString().slice(0, 10);

  try {
    const result = await pool.query(
      'SELECT * FROM daily_menu WHERE for_role = $1 AND date = $2 ORDER BY name ASC',
      [effectiveRole, today]
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

  const diferencia = (diaObjetivo + 7 - diaActual) % 7 || 7;
  const fechaObjetivo = new Date(hoy);
  fechaObjetivo.setDate(hoy.getDate() + diferencia);
  return fechaObjetivo.toISOString().split('T')[0];
}
