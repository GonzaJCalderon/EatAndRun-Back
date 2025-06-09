import {
  createUserProfile,
  updateUserProfile,
  getUserProfileById
} from '../models/userProfile.model.js';

// GET perfil del usuario logueado
export const getMyProfile = async (req, res) => {
  const userId = req.user.id;

  const profile = await getUserProfileById(userId);
  if (!profile) {
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }

  res.json(profile);
};

// POST crear perfil (una sola vez)
export const createMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { telefono, direccion_principal, direccion_alternativa, apellido } = req.body;

  const created = await createUserProfile({
    user_id: userId,
    telefono,
    direccion_principal,
    direccion_alternativa,
    apellido
  });

  res.status(201).json({ message: 'Perfil creado', profile: created });
};

// PUT actualizar perfil existente
export const updateMyProfile = async (req, res) => {
  const userId = req.user.id;
  const { telefono, direccion_principal, direccion_alternativa, apellido } = req.body;

  const updated = await updateUserProfile({
    user_id: userId,
    telefono,
    direccion_principal,
    direccion_alternativa,
    apellido
  });

  res.json({ message: 'Perfil actualizado', profile: updated });
};
