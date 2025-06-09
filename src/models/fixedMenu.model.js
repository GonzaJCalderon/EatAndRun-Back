import { pool } from '../db/index.js';

// Obtener todos los platos del menú fijo
export const getAllFixedMenu = async () => {
  const result = await pool.query('SELECT * FROM fixed_menu');
  return result.rows;
};

// Crear nuevo plato con imagen
export const createFixedMenuItem = async ({ name, description, price, image_url, for_role }) => {
  const result = await pool.query(
    'INSERT INTO fixed_menu (name, description, price, image_url, for_role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, description, price, image_url, for_role]
  );
  return result.rows[0];
};


// Actualizar plato (opcional: podés también manejar imagen acá si querés)
export const updateFixedMenuItem = async (id, { name, description, price, image_url }) => {
  const result = await pool.query(
    'UPDATE fixed_menu SET name = $1, description = $2, price = $3, image_url = $4 WHERE id = $5 RETURNING *',
    [name, description, price, image_url, id]
  );
  return result.rows[0];
};


// Eliminar plato
export const deleteFixedMenuItem = async (id) => {
  await pool.query('DELETE FROM fixed_menu WHERE id = $1', [id]);
};


// ✅ Solo recibe el `role`, no `req/res`
export const getFixedMenuForRole = async (role) => {
  const result = await pool.query(
    'SELECT * FROM fixed_menu WHERE for_role = $1',
    [role]
  );
  return result.rows;
};
