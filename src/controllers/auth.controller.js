import { register, login, completarPerfilFaltante } from '../services/auth.service.js';
import { createUserProfile } from '../models/userProfile.model.js';
import { createEmpresa } from '../models/empresa.model.js';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { sendResetPasswordEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { getUserById } from '../services/auth.service.js';
import { generarCodigoInvitacion } from '../models/empresa.model.js';

import { findUserByEmail } from '../models/user.model.js';



export const registerController = async (req, res) => {
  try {
    const {
      name,
      apellido,
      email,
      password,
      role,
      telefono,
      direccion_principal,
      direccion_alternativa,
      empresa,
      codigoInvitacion
    } = req.body;

const roleMap = {
  usuario: 1,
  empresa: 2,     // ✅ CORREGIDO
  delivery: 3,    // ✅ CORREGIDO
  admin: 4,
  moderador: 5,
  empleado: 6
};


    let role_id = roleMap[role] || 1;

    // Si viene código de invitación, forzar a rol 'empleado'
    if (codigoInvitacion) {
      const empleadoRoleRes = await pool.query(`SELECT id FROM roles WHERE name = 'empleado'`);
      if (!empleadoRoleRes.rows.length) {
        return res.status(500).json({ error: 'Rol empleado no existe en la base de datos' });
      }
      role_id = empleadoRoleRes.rows[0].id;
    }

    // 🔍 Verificar si ya existe
    const existing = await findUserByEmail(email);
    let user;

    if (existing) {
      if (existing.tiene_perfil) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      // Si no tiene perfil, completamos
      user = existing;

      await completarPerfilFaltante({
        user,
        telefono,
        direccion_principal,
        direccion_alternativa,
        role,
        empresa,
        codigoInvitacion
      });

    } else {
      // Crear usuario
      user = await register({ name, apellido, email, password, role_id });

      // Si es EMPRESA → crear en tabla empresa + generar código
      if (role === 'empresa') {
        const empresaCreada = await createEmpresa({
          user_id: user.id,
          razon_social: empresa?.razonSocial || `${name} ${apellido}`,
          cuit: empresa?.cuit || '00000000000'
        });

        await generarCodigoInvitacion(empresaCreada.id);
      }

      // Completar perfil
      await completarPerfilFaltante({
        user,
        telefono,
        direccion_principal,
        direccion_alternativa,
        role,
        empresa,
        codigoInvitacion
      });
    }

    await sendWelcomeEmail(email, name);

    res.status(201).json({ message: 'Usuario creado', user });

  } catch (err) {
    console.error('❌ Error en registerController:', err);
    res.status(400).json({ error: err.message });
  }
};


// ✅ LOGIN DE USUARIO
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password);

    res.json(result);
  } catch (err) {
    console.error('❌ Error en loginController:', err);
    res.status(401).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(200).json({ message: 'Si el correo está registrado, se enviará un enlace' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const link = `https://eatandrun.shop/reset-password/${token}`;
  await sendResetPasswordEmail(email, user.name, link);

  res.json({ message: 'Correo enviado' });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, decoded.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    return res.status(400).json({ error: 'Token inválido o expirado' });
  }
};

// POST /auth/change-password
export const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { actual, nueva } = req.body;

  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const match = await bcrypt.compare(actual, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const nuevaHash = await bcrypt.hash(nueva, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [
      nuevaHash,
      userId
    ]);

    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('❌ Error en changePassword:', err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};
