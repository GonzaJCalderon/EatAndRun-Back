// auth.service.js
import bcrypt from 'bcryptjs';               // <--- usa bcryptjs en todos lados
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { createUser, findUserByEmail, updateUserBasicInfo } from '../models/user.model.js';
import { pool } from '../db/index.js';
import { createUserProfile, updateUserProfile, getUserProfileById } from '../models/userProfile.model.js';


const roleMap = { 1:'usuario', 2:'empresa', 3:'delivery', 4:'admin', 5:'moderador' };

export const register = async ({ name, apellido, email, password, role_id }) => {
  const emailNorm = String(email).trim().toLowerCase();

  const existing = await findUserByEmail(emailNorm);
  if (existing) throw new Error('El email ya está registrado');

  const hash = await bcrypt.hash(password, 10);
  const user = await createUser({
    name,
    apellido,
    email: emailNorm,
    password: hash,
    role_id
  });
  return user;
};

export const login = async (email, plain) => {
  const emailNorm = String(email ?? '').trim().toLowerCase();
  const user = await findUserByEmail(emailNorm);

  const invalid = new Error('Credenciales inválidas');
  if (!user || !user.password) throw invalid;

  const dbPwd    = String(user.password ?? '').trim();
  const plainPwd = String(plain ?? '').trim();

  const looksHashed = /^\$2[aby]\$\d{2}\$/.test(dbPwd);
  let ok = false;

  if (looksHashed) {
    try { ok = await bcrypt.compare(plainPwd, dbPwd); } catch { ok = false; }
  } else {
    ok = dbPwd === plainPwd;
    if (ok) {
      const newHash = await bcrypt.hash(plainPwd, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
    }
  }

  if (!ok) throw invalid;

  const roleName = roleMap[user.role_id] || 'usuario';
  const token = jwt.sign({ id: user.id, role: roleName }, config.jwtSecret, { expiresIn: '8h' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      apellido: user.last_name,
      email: user.email,
      role: roleName
    }
  };
};


export const getUserById = async (id) => {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0];
};

export const completarPerfilFaltante = async ({
  user, telefono, direccion_principal, direccion_alternativa, role, empresa, codigoInvitacion, apellido
}) => {
  const necesitaApellido = !user.last_name && apellido;
  if (necesitaApellido) {
    await updateUserBasicInfo({ user_id: user.id, name: user.name, apellido });
  }


  // 2) user_profiles crear/actualizar con direccion_alternativa
  const perfil = await getUserProfileById(user.id);

  if (!perfil || !perfil.telefono) {
    await createUserProfile({
      user_id: user.id,
      telefono: telefono || null,
      direccion_principal: direccion_principal || null,
      direccion_alternativa: direccion_alternativa || null,
    });
  } else {
    await updateUserProfile({
      user_id: user.id,
      telefono: telefono ?? perfil.telefono,
      direccion_principal: direccion_principal ?? perfil.direccion_principal,
      direccion_alternativa: direccion_alternativa ?? perfil.direccion_alternativa,
    });
  }
};
