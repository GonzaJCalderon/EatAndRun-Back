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


export const updateUserProfile = async ({ user_id, telefono, direccion_principal, direccion_alternativa, apellido }) => {
  const query = `
    INSERT INTO user_profiles (user_id, telefono, direccion_principal, direccion_alternativa)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE SET
      telefono = EXCLUDED.telefono,
      direccion_principal = EXCLUDED.direccion_principal,
      direccion_alternativa = EXCLUDED.direccion_alternativa
  `;
  await pool.query(query, [
    user_id,
    telefono || null,
    direccion_principal || null,
    direccion_alternativa || null
  ]);

  if (apellido !== undefined) {
    await pool.query('UPDATE users SET last_name = $1 WHERE id = $2', [apellido, user_id]);
  }
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
