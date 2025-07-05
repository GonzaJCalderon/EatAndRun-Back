import { pool } from '../db/index.js';

const roleMap = {
  1: "usuario",
  2: "empresa",
  3: "delivery",
  4: "admin",
  5: "moderador",
  6: "empleado", // 👈 AGREGADO
};


export const createUser = async ({ name, apellido, email, password, role_id }) => {
  const result = await pool.query(
    `INSERT INTO users (name, last_name, email, password, role_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, last_name, email, role_id`,
    [name, apellido, email, password, role_id]
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

export const getAllUsers = async () => {
  const result = await pool.query(`
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      u.role_id,
      up.apellido, -- 👈 AÑADILO
      up.telefono,
      up.direccion_principal,
      up.direccion_secundaria
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY u.id ASC
  `);

  return result.rows.map(user => ({
    id: user.id,
    nombre: user.name,
    apellido: user.apellido || "—", // 👈 NUEVO
    email: user.email,
    rol: roleMap[user.role_id] || "usuario",
    telefono: user.telefono,
    direccion_principal: user.direccion_principal,
    direccion_secundaria: user.direccion_secundaria
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


export const createEmpresaUser = async ({ empresa_id, user_id, rol }) => {
  const result = await pool.query(
    `INSERT INTO empresa_users (empresa_id, user_id, rol)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [empresa_id, user_id, rol]
  );
  return result.rows[0];
};

export const updateUserBasicInfo = async ({ user_id, name, apellido }) => {
  const result = await pool.query(
    `UPDATE users 
     SET name = $1, last_name = $2 
     WHERE id = $3 
     RETURNING id, name, last_name, email, role_id`,
    [name, apellido, user_id]
  );
  return result.rows[0];
};

