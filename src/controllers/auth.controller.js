import { register, login } from '../services/auth.service.js';
import { createUserProfile} from '../models/userProfile.model.js';
import { createEmpresa } from '../models/empresa.model.js';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { sendResetPasswordEmail } from '../utils/mailer.js';
import { compare, hash } from 'bcryptjs';
import { getUserById } from '../services/auth.service.js';


// ✅ REGISTRO DE USUARIO
export const registerController = async (req, res) => {
  try {
  const {
  name,
  apellido, // 👈 AGREGADO
  email,
  password,
  role,
  telefono,
  direccion_principal,
  direccion_alternativa,
  empresa
} = req.body;


    const roleMap = {
      1: 1, // usuario
      2: 2, // empresa
      3: 5, // delivery
      4: 4  // admin
    };

    const role_id = roleMap[role] || 1;

const user = await register({ name, apellido, email, password, role_id });

await createUserProfile({
  user_id: user.id,
  telefono,
  direccion_principal,
  direccion_alternativa,
  apellido
});




    if (role === 'empresa' && empresa) {
      await createEmpresa({
        user_id: user.id,
        razon_social: empresa.razonSocial,
        cuit: empresa.cuit
      });
    }

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

    const result = await login(email, password); // login ya devuelve el role como string

    res.json(result); // ✅ usamos el objeto directamente
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

  const link = `${process.env.FRONTEND_URL}/reset-password/${token}`;
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

    const match = await bcrypt.compare(actual, user.password); // 👈 usamos "password"
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



