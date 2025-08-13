import { pool } from '../db/index.js';

export const getDailyMenu = async (req, res) => {
  const roleId = req.user.role;
  const roleName = roleMap[roleId];

  if (!roleName) {
    return res.status(403).json({ error: 'Rol no autorizado para ver menú del día' });
  }

  try {
    const items =
      roleName === 'admin'
        ? await pool.query('SELECT * FROM daily_menu ORDER BY date DESC') // 🔥 sin filtro
        : await getDailyMenuForRole(roleName);

    res.json(items.rows ?? items); // dependiendo del origen
  } catch (err) {
    console.error('❌ Error al obtener menú del día:', err);
    res.status(500).json({ error: 'Error interno al obtener el menú del día' });
  }
};

export const getAllDailyMenuItems = async () => {
  const result = await pool.query('SELECT * FROM daily_menu ORDER BY date DESC');
  return result.rows;
};



export const getDailyMenuForRole = async (roleName) => {
  const result = await pool.query(
    'SELECT * FROM daily_menu WHERE for_role = $1 ORDER BY date DESC',
    [roleName]
  );
  return result.rows;
};

export const createDailyMenuItem = async ({ name, description, date, image_url }) => {
  const result = await pool.query(
    `INSERT INTO daily_menu (name, description, date, image_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name, date) DO NOTHING
     RETURNING *`,
    [name, description, date, image_url]
  );
  return result.rows[0]; // Puede ser undefined si ya existía
};





export const updateDailyMenuItem = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) throw new Error('No fields provided');

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(fields);

  const query = `
    UPDATE daily_menu
    SET ${setClause}
    WHERE id = $${keys.length + 1}
    RETURNING *;
  `;

  const result = await pool.query(query, [...values, id]);
  return result.rows[0];
};


export const getSpecialMenuForCompany = async () => {
  const result = await pool.query(
    'SELECT * FROM special_company_menu ORDER BY date DESC'
  );
  return result.rows;
};







export const deleteDailyMenuItem = async (id) => {
  await pool.query('DELETE FROM daily_menu WHERE id = $1', [id]);
};
