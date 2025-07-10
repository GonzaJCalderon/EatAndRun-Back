import {
  getAllUsers as getAllUsersQuery,
  updateUserRole as updateUserRoleQuery
} from '../models/user.model.js';
import { createEmpresa } from '../models/empresa.model.js';
import { pool } from '../db/index.js';
import { findUserByEmail, createUser } from '../models/user.model.js';



export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const allUsers = await getAllUsersQuery(); // ✅ nombre corregido
    const filtered = role
      ? allUsers.filter(u => u.rol === role)
      : allUsers;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
  }

};

export const getTodasLasEmpresas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.razon_social AS nombre,
        e.codigo_invitacion,
        e.codigo_expira,
        e.cuit,
        u.name AS responsable_nombre,
        u.email AS responsable_email
      FROM empresas e
      JOIN users u ON u.id = e.user_id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener empresas:", err);
    res.status(500).json({ error: 'Error interno al obtener empresas' });
  }
};





// PUT /api/admin/users/:id/role
export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;

  const roleMap = {
    usuario: 1,
    empresa: 2,
    delivery: 3,
    admin: 4
  };

  const role_id = roleMap[rol];
  if (!role_id) {
    return res.status(400).json({ error: 'Rol no permitido' });
  }

  try {
    const updatedUser = await updateUserRoleQuery(id, role_id);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Rol actualizado correctamente', user: updatedUser });
  } catch (err) {
    console.error("❌ Error al actualizar rol:", err);
    res.status(500).json({ error: 'Error al actualizar rol del usuario' });
  }
};

// POST /admin/users
export const createUserAdmin = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  const roleMap = { usuario: 1, empresa: 2, delivery: 3, admin: 4 };
  const role_id = roleMap[rol];

  if (!nombre || !email || !password || !role_id) {
    return res.status(400).json({ error: "Campos incompletos o rol inválido" });
  }

  try {
    const nuevo = await createUserInDb({ name: nombre, email, password, role_id });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

export const deleteUserById = async (req, res) => {
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    // 🔥 Solo se borra el usuario (lo demás se borra en cascada)
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ message: '✅ Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', {
      message: error.message,
      detail: error.detail,
      stack: error.stack
    });

    return res.status(500).json({
      message: 'Error interno del servidor',
      detail: error.detail || error.message
    });
  }
};


// controllers/admin.controller.js


export const crearEmpresa = async (req, res) => {
  try {
    const { nombre, responsable_email, cuit } = req.body;

    if (!nombre || !responsable_email) {
      return res.status(400).json({ error: 'Campos incompletos: nombre y responsable_email requeridos' });
    }

    // Revisa si ya existe un usuario con este email
    let user = await findUserByEmail(responsable_email);

    if (!user) {
      // Creamos el usuario responsable
     user = await createUser({
  name: nombre,
  email: responsable_email,
  password: 'temporal123',
  role_id: 2 // 👈 2 = empresa
});

    }

    // Crea la empresa asociada a este usuario
    const empresaCreada = await createEmpresa({
      user_id: user.id,
      razon_social: nombre,
      cuit: cuit || null
    });

    res.status(201).json({
      message: '✅ Empresa creada correctamente',
      empresa: empresaCreada
    });

  } catch (error) {
    console.error('❌ Error al crear empresa:', error);
    res.status(500).json({ error: 'Error interno al crear empresa' });
  }
};


