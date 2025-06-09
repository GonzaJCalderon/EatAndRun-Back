import { pool } from '../db/index.js';

const roleMap = {
  1: "usuario",
  2: "empresa",
  3: "delivery",
  4: "admin",
  5: "moderador",
};

export const createUser = async ({ name, email, password, role_id }) => {
  const result = await pool.query(
    'INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role_id',
    [name, email, password, role_id]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

// ✅ Obtener todos los usuarios (sin contraseña)
export const getAllUsers = async () => {
  const result = await pool.query(
    'SELECT id, name, email, role_id FROM users ORDER BY id ASC'
  );

  return result.rows.map(user => ({
    id: user.id,
    nombre: user.name,
    email: user.email,
    rol: roleMap[user.role_id] || "usuario" // 👈 convierte a string
  }));
};

// ✅ Actualizar rol de usuario
export const updateUserRole = async (id, role_id) => {
  const result = await pool.query(
    'UPDATE users SET role_id = $1 WHERE id = $2 RETURNING id, name, email, role_id',
    [role_id, id]
  );
  return result.rows[0]; // Puede ser undefined si no existe
};

