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
