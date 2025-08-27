import { pool } from '../db/index.js';

/**
 * Crea una relación entre un usuario y una empresa con un rol determinado.
 * @param {Object} data - { empresa_id, user_id, rol }
 */
export const createEmpresaUser = async ({ empresa_id, user_id, rol = 'empleado' }) => {
  const result = await pool.query(
    `INSERT INTO empresa_users (empresa_id, user_id, rol)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [empresa_id, user_id, rol]
  );
  return result.rows[0];
};

/**
 * Devuelve todos los usuarios asociados a una empresa.
 * @param {number} empresaId
 */
export const getEmpleadosByEmpresa = async (empresaId) => {
  const result = await pool.query(
    `SELECT 
       u.id, 
       u.name, 
       u.last_name AS apellido, 
       u.email, 
       eu.rol
     FROM empresa_users eu
     JOIN users u ON u.id = eu.user_id
     WHERE eu.empresa_id = $1`,
    [empresaId]
  );

  return result.rows;
};

/**
 * Verifica si un usuario ya está asignado a una empresa
 */
export const isUserInEmpresa = async (empresa_id, user_id) => {
  const result = await pool.query(
    `SELECT * FROM empresa_users WHERE empresa_id = $1 AND user_id = $2`,
    [empresa_id, user_id]
  );
  return result.rowCount > 0;
};

/**
 * Elimina un empleado de una empresa
 */
export const removeEmpleado = async ({ empresa_id, user_id }) => {
  const result = await pool.query(
    `DELETE FROM empresa_users WHERE empresa_id = $1 AND user_id = $2 RETURNING *`,
    [empresa_id, user_id]
  );
  return result.rows[0];
};


// ✅ Asociar un usuario a una empresa
export const asociarEmpleadoAEmpresa = async ({ empresa_id, user_id, rol = 'empleado' }) => {
  const result = await pool.query(
    `INSERT INTO empresa_users (empresa_id, user_id, rol)
     VALUES ($1, $2, $3)
     ON CONFLICT (empresa_id, user_id) DO NOTHING
     RETURNING *`,
    [empresa_id, user_id, rol]
  );
  return result.rows[0]; // Devuelve undefined si ya estaba
};

// ✅ Buscar empresa por código
export const encontrarEmpresaPorCodigo = async (codigo) => {
  const result = await pool.query(
    `SELECT id, user_id, codigo_invitacion, codigo_expira
     FROM empresas
     WHERE codigo_invitacion = $1`,
    [codigo]
  );
  return result.rows[0];
};