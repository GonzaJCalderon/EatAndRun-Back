// models/tartasModel.js
import { pool } from '../db/index.js';

export const getAllTartas = async () => {
  const result = await pool.query('SELECT * FROM tartas ORDER BY id ASC');
  return result.rows;
};

export const createTarta = async ({ key, nombre, descripcion, img, precio }) => {
  const result = await pool.query(
    'INSERT INTO tartas (key, nombre, descripcion, img, precio) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [key, nombre, descripcion, img, precio]
  );
  return result.rows[0];
};


export const updateTarta = async (id, { nombre, key, descripcion, img, precio }) => {
  const result = await pool.query(
    `UPDATE tartas
     SET nombre = $1, key = $2, descripcion = $3, img = $4, precio = $5
     WHERE id = $6
     RETURNING *`,
    [nombre, key, descripcion, img, precio, id]
  );
  return result.rows[0];
};


export const deleteTarta = async (id) => {
  await pool.query('DELETE FROM tartas WHERE id = $1', [id]);
};
