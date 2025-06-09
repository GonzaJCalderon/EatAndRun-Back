import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { createUser, findUserByEmail } from '../models/user.model.js';
const roleMap = {
  1: 'usuario',
  2: 'empresa',
  3: 'delivery',
  4: 'admin',
  5: 'moderador'
};


export const register = async (data) => {
  const { name, email, password, role_id } = data;

  const existing = await findUserByEmail(email);
  if (existing) throw new Error('El email ya está registrado');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, password: hashedPassword, role_id });

  return user;
};

export const login = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error('Usuario no encontrado');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Contraseña incorrecta');

  // 🔁 Convertimos el role_id a string legible
  const roleName = roleMap[user.role_id] || 'usuario';

  const token = jwt.sign(
    { id: user.id, role: roleName },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleName // 👈 este se verá como "delivery", "admin", etc
    }
  };
};
