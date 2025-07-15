import { pool } from '../db/index.js';

// Obtener todos los platos del menú fijo
export const getAllFixedMenu = async () => {
  const result = await pool.query('SELECT * FROM fixed_menu');
  return result.rows;
};

// Crear nuevo plato con imagen
export const createFixedMenuItem = async ({ name, description, price, image_url }) => {
  const ALL_ORDERING_ROLES = ['usuario', 'empresa', 'empleado', 'admin'];

  const result = await pool.query(
    `INSERT INTO fixed_menu (name, description, price, image_url, for_role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description, price, image_url, ALL_ORDERING_ROLES]
  );
  return result.rows[0];
};


// Actualizar plato (opcional: podés también manejar imagen acá si querés)
export const updateFixedMenuItem = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) throw new Error('No fields provided');

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(fields);

  const query = `
    UPDATE fixed_menu
    SET ${setClause}
    WHERE id = $${keys.length + 1}
    RETURNING *;
  `;

  const result = await pool.query(query, [...values, id]);
  return result.rows[0];
};



// Eliminar plato
export const deleteFixedMenuItem = async (id) => {
  await pool.query('DELETE FROM fixed_menu WHERE id = $1', [id]);
};


// ✅ Solo recibe el `role`, no `req/res`
export const getFixedMenuForRole = async (role) => {
  const result = await pool.query(
    `SELECT * FROM fixed_menu 
     WHERE $1 = ANY(for_role)`,
    [role]
  );
  return result.rows;
};
