// models/empresa.model.js
import { pool } from '../db/index.js';


import { nanoid } from 'nanoid';

/**
 * Genera y guarda un código de invitación para una empresa.
 * @param {number} empresaId - ID de la empresa
 * @returns {string} - Código generado
 */

export const generarCodigoInvitacion = async (empresaId, horasValidez = 72) => {
  const codigo = nanoid(10);
  const expira = new Date(Date.now() + horasValidez * 60 * 60 * 1000); // Expira en X horas

  await pool.query(
    `UPDATE empresas 
     SET codigo_invitacion = $1, codigo_expira = $2 
     WHERE id = $3`,
    [codigo, expira, empresaId]
  );

  return { codigo, expira }; // 👈 ESTA LÍNEA ES CLAVE
};

export const createEmpresa = async ({ user_id, razon_social, cuit }) => {
  const result = await pool.query(
    'INSERT INTO empresas (user_id, razon_social, cuit) VALUES ($1, $2, $3) RETURNING *',
    [user_id, razon_social, cuit]
  );
  return result.rows[0];
};


export const getEmpleadosByEmpresa = async (empresaId) => {
  const result = await pool.query(
    `SELECT 
       u.id, 
       u.name, 
       u.last_name AS apellido, -- 👈 renombrado para frontend
       u.email, 
       eu.rol
     FROM empresa_users eu
     JOIN users u ON u.id = eu.user_id
     WHERE eu.empresa_id = $1`,
    [empresaId]
  );

  return result.rows;
};
