import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { createUser, findUserByEmail } from '../models/user.model.js';
import { pool } from '../db/index.js';
import { createUserProfile } from '../models/userProfile.model.js';
import { createEmpresa } from '../models/empresa.model.js';
import { asociarEmpleadoAEmpresa, isUserInEmpresa } from '../models/empresaUsers.model.js';

const roleMap = {
  1: 'usuario',
  2: 'empresa',
  3: 'delivery',
  4: 'admin',
  5: 'moderador'
};

// auth.service.js
export const register = async (data) => {
  const { name, apellido, email, password, role_id } = data;

  const existing = await findUserByEmail(email); // 🔍 ACÁ
  if (existing) throw new Error('El email ya está registrado');


  const hashedPassword = await bcrypt.hash(password, 10);
const user = await createUser({ name, apellido, email, password: hashedPassword, role_id });


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
    apellido: user.last_name, // 👈 AGREGADO
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
  user,
  telefono,
  direccion_principal,
  direccion_alternativa,
  role,
  empresa,
  codigoInvitacion
}) => {
  // 1. Crear perfil si no existe
  const perfilRes = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);

  if (perfilRes.rows.length === 0) {
    await createUserProfile({
      user_id: user.id,
      telefono,
      direccion_principal,
      direccion_alternativa
    });
    console.log(`📘 Perfil creado para user_id=${user.id}`);
  } else {
    console.log(`ℹ️ Perfil ya existente para user_id=${user.id}`);
  }

  // 2. Si es empresa, y no existe aún
  if (role === 'empresa' && empresa?.razonSocial && empresa?.cuit) {
    const empresaRes = await pool.query('SELECT * FROM empresas WHERE user_id = $1', [user.id]);

    if (empresaRes.rows.length === 0) {
      await createEmpresa({
        user_id: user.id,
        razon_social: empresa.razonSocial,
        cuit: empresa.cuit
      });
      console.log(`🏢 Empresa creada para user_id=${user.id}`);
    } else {
      console.log(`ℹ️ Empresa ya registrada para user_id=${user.id}`);
    }
  }

  // 3. Si tiene código de invitación, lo asociamos a empresa
  if (codigoInvitacion) {
    const empresaEncontrada = await encontrarEmpresaPorCodigo(codigoInvitacion);

    if (!empresaEncontrada) throw new Error('Código de invitación inválido');

    if (
      empresaEncontrada.codigo_expira &&
      new Date(empresaEncontrada.codigo_expira) < new Date()
    ) {
      throw new Error('El código de invitación ha expirado');
    }

    const yaAsociado = await isUserInEmpresa(empresaEncontrada.id, user.id);

    if (!yaAsociado) {
      await asociarEmpleadoAEmpresa({
        empresa_id: empresaEncontrada.id,
        user_id: user.id,
        rol: 'empleado'
      });
      console.log(`✅ Asociado como empleado a empresa ID ${empresaEncontrada.id}`);
    } else {
      console.log(`ℹ️ Usuario ya estaba asociado a empresa ID ${empresaEncontrada.id}`);
    }
  }
};