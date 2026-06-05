import { pool } from '../db/index.js';

// ✅ Limpio y sin apellido duplicado

export const createUserProfile = async ({ user_id, telefono, direccion_principal, direccion_alternativa }) => {
  const campos = ['user_id', 'telefono', 'direccion_principal'];
  const valores = [user_id, telefono, direccion_principal];
  let placeholders = ['$1', '$2', '$3'];
  let index = 4;

  if (direccion_alternativa) {
    campos.push('direccion_alternativa');
    valores.push(direccion_alternativa);
    placeholders.push(`$${index++}`);
  }

  const query = `
    INSERT INTO user_profiles (${campos.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (user_id) DO NOTHING
  `;

  await pool.query(query, valores);
};


export const updateUserProfile = async ({ user_id, telefono, direccion_principal, direccion_alternativa }) => {
  const updates = [];
  const values = [];
  let i = 1;

  if (telefono !== undefined) {
    updates.push(`telefono = $${i++}`);
    values.push(telefono);
  }

  if (direccion_principal !== undefined) {
    updates.push(`direccion_principal = $${i++}`);
    values.push(direccion_principal);
  }

  if (direccion_alternativa !== undefined) {
    updates.push(`direccion_alternativa = $${i++}`);
    values.push(direccion_alternativa);
  }

  if (updates.length === 0) return; // No hay nada que actualizar

  values.push(user_id);
  const query = `
    UPDATE user_profiles
    SET ${updates.join(', ')}
    WHERE user_id = $${i}
  `;

  await pool.query(query, values);
};


export const getUserProfileById = async (user_id) => {
  const result = await pool.query(
    `SELECT users.id, users.name, users.last_name AS apellido, users.email,
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
