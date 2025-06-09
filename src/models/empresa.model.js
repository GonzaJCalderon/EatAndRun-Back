// models/empresa.model.js
import { pool } from '../db/index.js';

export const createEmpresa = async ({ user_id, razon_social, cuit }) => {
  const result = await pool.query(
    'INSERT INTO empresas (user_id, razon_social, cuit) VALUES ($1, $2, $3) RETURNING *',
    [user_id, razon_social, cuit]
  );
  return result.rows[0];
};
