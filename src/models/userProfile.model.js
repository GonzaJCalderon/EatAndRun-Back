import { pool } from '../db/index.js';

export const createUserProfile = async ({ user_id, telefono, direccion_principal, direccion_alternativa, apellido }) => {
  const result = await pool.query(
    `INSERT INTO user_profiles 
     (user_id, telefono, direccion_principal, direccion_alternativa, apellido) 
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user_id, telefono, direccion_principal, direccion_alternativa, apellido]
  );
  return result.rows[0];
};

export const updateUserProfile = async ({ user_id, telefono, direccion_principal, direccion_alternativa, apellido }) => {
  const result = await pool.query(
    `UPDATE user_profiles 
     SET telefono = $1, direccion_principal = $2, direccion_alternativa = $3, apellido = $4 
     WHERE user_id = $5 RETURNING *`,
    [telefono, direccion_principal, direccion_alternativa, apellido, user_id]
  );
  return result.rows[0];
};

export const getUserProfileById = async (user_id) => {
  const result = await pool.query(
    `SELECT users.id, users.name, users.email,
            user_profiles.apellido,
            user_profiles.telefono,
            user_profiles.direccion_principal,
            user_profiles.direccion_alternativa
     FROM users
     LEFT JOIN user_profiles ON users.id = user_profiles.user_id
     WHERE users.id = $1`,
    [user_id]
  );

  return result.rows[0]; // ✅ devuelve incluso si no hay perfil
};
