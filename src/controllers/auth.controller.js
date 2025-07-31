import { register, login, completarPerfilFaltante } from '../services/auth.service.js';
import { createUserProfile } from '../models/userProfile.model.js';
import { createEmpresa } from '../models/empresa.model.js';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { sendResetPasswordEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { getUserById } from '../services/auth.service.js';
import { generarCodigoInvitacion } from '../models/empresa.model.js';
import { encontrarEmpresaPorCodigo, isUserInEmpresa, asociarEmpleadoAEmpresa } from '../models/empresaUsers.model.js';


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

    // 🧭 Mapeo de roles
    const roleMap = {
      usuario: 1,
      empresa: 2,
      delivery: 3,
      admin: 4,
      moderador: 5,
      empleado: 6
    };

    // 🛑 Validación de rol base
    let role_id = roleMap[role] || roleMap.usuario;

    // 🔐 Si viene por invitación, el rol debe ser "empleado"
    if (codigoInvitacion) {
      const empleadoRole = await pool.query(`SELECT id FROM roles WHERE name = 'empleado'`);
      if (!empleadoRole.rowCount) {
        return res.status(500).json({ error: 'Rol empleado no existe en la base de datos' });
      }
      role_id = empleadoRole.rows[0].id;
    }

    // 🔍 Validar existencia previa
    const existing = await findUserByEmail(email);
    let user;

    if (existing) {
      if (existing.tiene_perfil) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      user = existing; // continuar con el user incompleto

    } else {
      // ✅ Crear nuevo usuario
      user = await register({ name, apellido, email, password, role_id });
    }

    // 🧩 Completar perfil básico
    await completarPerfilFaltante({
      user,
      telefono,
      direccion_principal,
      direccion_alternativa,
      role,
      empresa,
      codigoInvitacion
    });

    if (codigoInvitacion) {
  const empresa = await encontrarEmpresaPorCodigo(codigoInvitacion);

  if (!empresa) {
    return res.status(400).json({ error: 'Código de invitación inválido' });
  }

  if (empresa.codigo_expira && new Date(empresa.codigo_expira) < new Date()) {
    return res.status(400).json({ error: 'El código de invitación ha expirado' });
  }

  const yaAsociado = await isUserInEmpresa(empresa.id, user.id);
  if (!yaAsociado) {
    await asociarEmpleadoAEmpresa({
      empresa_id: empresa.id,
      user_id: user.id,
      rol: 'empleado'
    });
  }
}


    // 🏢 Si es empresa → crear empresa asociada
    if (role === 'empresa') {
      const nuevaEmpresa = await createEmpresa({
        user_id: user.id,
        razon_social: empresa?.razonSocial || `${name} ${apellido}`,
        cuit: empresa?.cuit || '00000000000'
      });

      await generarCodigoInvitacion(nuevaEmpresa.id);
    }

    // 🤝 Si viene con código de invitación → asociar como empleado
    if (codigoInvitacion) {
      const empresaRes = await pool.query(
        `SELECT id, codigo_expira FROM empresas WHERE codigo_invitacion = $1`,
        [codigoInvitacion]
      );

      if (!empresaRes.rowCount) {
        return res.status(400).json({ error: 'Código de invitación inválido' });
      }

      const empresa = empresaRes.rows[0];

      if (empresa.codigo_expira && new Date(empresa.codigo_expira) < new Date()) {
        return res.status(400).json({ error: 'El código de invitación ha expirado' });
      }

      // Asociar en empresa_users si no existe
      await pool.query(
        `INSERT INTO empresa_users (empresa_id, user_id, rol)
         VALUES ($1, $2, 'empleado')
         ON CONFLICT (empresa_id, user_id) DO NOTHING`,
        [empresa.id, user.id]
      );
    }

    // 📬 Email de bienvenida
    await sendWelcomeEmail(email, name);

    res.status(201).json({ message: 'Usuario creado correctamente', user });

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

// auth.controller.js
export const verificarCodigoEmpresa = async (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ error: 'Código es requerido' });
  }

  try {
    const empresa = await pool.query(
      'SELECT razon_social FROM empresas WHERE codigo_invitacion = $1 AND codigo_expira > NOW()',
      [codigo]
    );

    if (empresa.rowCount === 0) {
      return res.status(404).json({ error: 'Código inválido o expirado' });
    }

    res.json({ nombreEmpresa: empresa.rows[0].razon_social });
  } catch (err) {
    console.error('❌ Error al verificar código:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

