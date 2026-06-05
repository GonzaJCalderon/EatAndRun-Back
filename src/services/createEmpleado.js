import { pool } from '../db/index.js';
import { findUserByEmail, createUser } from '../models/user.model.js'; // 👈 ESTA LÍNEA FALTABA
import { sendResetPasswordEmail, sendWelcomeEmail } from '../utils/mailer.js';
import {
  createEmpresaUser,
  isUserInEmpresa,
  removeEmpleado,
  encontrarEmpresaPorCodigo, 
  asociarEmpleadoAEmpresa
} from '../models/empresaUsers.model.js';
import bcrypt from 'bcryptjs';


export const crearEmpleadoDesdeEmpresa = async ({ name, apellido, email, empresa_id }) => {
  let user = await findUserByEmail(email);

  let passwordAuto;

  if (!user) {
    passwordAuto = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(passwordAuto, 10);
    const roleEmpleadoId = 6;

    const result = await pool.query(
      `INSERT INTO users (name, last_name, email, password, role_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, last_name, email`, // ✅ Aquí el fix
      [name, apellido, email, hash, roleEmpleadoId]
    );

    user = result.rows[0];

    await sendWelcomeEmail(email, name, passwordAuto);
  }

  // Verificamos si ya está asociado a esta empresa
  const yaExiste = await pool.query(
    `SELECT * FROM empresa_users WHERE empresa_id = $1 AND user_id = $2`,
    [empresa_id, user.id]
  );

  if (yaExiste.rowCount > 0) {
    throw new Error('⚠️ El usuario ya pertenece a la empresa');
  }

  await createEmpresaUser({
    empresa_id,
    user_id: user.id,
    rol: 'empleado'
  });

  return passwordAuto
    ? { ...user, password: passwordAuto }
    : user;
};
