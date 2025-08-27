import { pool } from '../db/index.js';
import {
  createUserProfile,
  updateUserProfile,
  getUserProfileById
} from '../models/userProfile.model.js';

import { updateUserBasicInfo } from '../models/user.model.js'; // ✅ CORRECTO



export const getMyProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const userRes = await pool.query(
      'SELECT id, name, last_name AS apellido, email FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userRes.rows[0];

    const profileRes = await pool.query(
      `SELECT telefono, direccion_principal, direccion_alternativa
       FROM user_profiles
       WHERE user_id = $1`,
      [userId]
    );

    const profile = profileRes.rows[0] || {};

    // 🔥 Devolvemos SIEMPRE datos válidos, incluso si no hay perfil
    res.status(200).json({
      id: user.id,
      name: user.name,
      apellido: user.apellido, // 👈 usamos el apellido de users, no del perfil
      email: user.email,
      telefono: profile.telefono || '',
      direccion_principal: profile.direccion_principal || '',
      direccion_alternativa: profile.direccion_alternativa || ''
    });
  } catch (err) {
    console.error('❌ Error en getMyProfile:', err);
    res.status(500).json({ error: 'Error interno al obtener perfil' });
  }
};



// Crear perfil
export const createMyProfile = async (req, res) => {
  const userId = req.user.id;
const { telefono, direccion_principal, direccion_alternativa } = req.body;

  try {
    const created = await createUserProfile({
      user_id: userId,
      telefono,
      direccion_principal,
      direccion_alternativa,
    
    });

    res.status(201).json({ message: 'Perfil creado', profile: created });
  } catch (err) {
    console.error('❌ Error al crear perfil:', err);
    res.status(500).json({ error: 'Error interno al crear perfil' });
  }
};

// Actualizar perfil
export const updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { email, telefono, direccion_principal, direccion_alternativa, apellido } = req.body;

  try {
    const updated = await updateUserProfile({
      user_id: userId,
      telefono,
      direccion_principal,
      direccion_alternativa,
      apellido
    });

    if (email) {
      await pool.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        [email, userId]
      );
    }

    res.json({ message: 'Perfil actualizado', profile: updated });
  } catch (err) {
    console.error('❌ Error al actualizar perfil:', err);
    res.status(500).json({ error: 'Error interno al actualizar perfil' });
  }
};
