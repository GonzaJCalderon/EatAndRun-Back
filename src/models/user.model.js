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
    [name, apellido, email, password, role_id] // <- ACÁ
  );

  return result.rows[0];
};


export const findUserByEmail = async (email) => {
  const emailNorm = String(email ?? '').trim().toLowerCase();
  const res = await pool.query(`
    SELECT u.*, p.user_id IS NOT NULL AS tiene_perfil
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1
  `, [emailNorm]);
  return res.rows[0];
};



export const getAllUsers = async () => {
  const result = await pool.query(`
   SELECT 
  u.id, 
  u.name, 
  u.last_name AS apellido,        -- ✅
  u.email, 
  u.role_id,
  up.telefono,
  up.direccion_principal,
  up.direccion_alternativa,       -- ✅
  up.direccion_alternativa AS direccion_secundaria -- compat
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
ORDER BY u.id ASC;

  `);
return result.rows.map(user => ({
  id: user.id,
  nombre: user.name,
  apellido: user.apellido || "—",
  email: user.email,
  rol: roleMap[user.role_id] || "usuario",
  telefono: user.telefono,
  direccion_principal: user.direccion_principal,
  direccion_alternativa: user.direccion_alternativa || user.direccion_secundaria || null
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

