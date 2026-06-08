// models/tartasModel.js
import { pool } from '../db/index.js';

export const getAllTartas = async () => {
  const { rows } = await pool.query(`
    SELECT id, "key", nombre, descripcion, img, precio
    FROM tartas
    ORDER BY nombre ASC
  `);
  return rows;
};



export const createTarta = async ({ key, nombre, descripcion = '', img = '', precio = 0 }) => {
  if (!key?.trim() || !nombre?.trim()) {
    throw new Error('Los campos "key" y "nombre" son obligatorios');
  }

  const result = await pool.query(
    `
    INSERT INTO tartas ("key", nombre, descripcion, img, precio)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT ("key")
    DO UPDATE SET 
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      img = EXCLUDED.img,
      precio = EXCLUDED.precio
    RETURNING *
    `,
    [key, nombre, descripcion, img, precio]
  );

  return result.rows[0];
};


export const updateTarta = async (id, data) => {
  const campos = [];
  const valores = [];
  let idx = 1;

  for (const clave of ['nombre', 'descripcion', 'precio', 'img', 'key']) {
    if (clave in data) {
      campos.push(`${clave} = $${idx}`);
      valores.push(data[clave]);
      idx++;
    }
  }

  if (campos.length === 0) throw new Error('No hay campos para actualizar');

  valores.push(id); // último valor es el ID
  const query = `
    UPDATE tartas SET ${campos.join(', ')} WHERE id = $${idx} RETURNING *
  `;

  const result = await pool.query(query, valores);
  return result.rows[0];
};



export const deleteTarta = async (id) => {
  await pool.query('DELETE FROM tartas WHERE id = $1', [id]);
};
