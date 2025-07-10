// src/models/config.model.js
import pool from '../db/db.js';

export const getConfig = async (clave) => {
  const { rows } = await pool.query(
    'SELECT valor FROM configuraciones WHERE clave = $1',
    [clave]
  );
  return rows[0]?.valor || null;
};

export const setConfig = async (clave, valor) => {
  await pool.query(
    `
    INSERT INTO configuraciones (clave, valor)
    VALUES ($1, $2)
    ON CONFLICT (clave)
    DO UPDATE SET valor = EXCLUDED.valor
    `,
    [clave, valor]
  );
};
