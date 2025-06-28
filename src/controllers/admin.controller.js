import {
  getAllUsers as getAllUsersQuery,
  updateUserRole as updateUserRoleQuery
} from '../models/user.model.js';

export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const allUsers = await getAllUsersQuery(); // ✅ Usa la función bien hecha
    const filtered = role
      ? allUsers.filter(u => u.rol === role)
      : allUsers;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
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
export const createUser = async (req, res) => {
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
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    // Verificá si hay pedidos asociados
    const pedidos = await pool.query('SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1', [id]);
    if (pedidos.rowCount > 0) {
      return res.status(409).json({ message: '❌ No se puede eliminar: el usuario tiene pedidos asociados.' });
    }

    // Eliminar perfil
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [id]);

    // Eliminar usuario
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ message: '✅ Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor', detail: error.detail });
  }
};


