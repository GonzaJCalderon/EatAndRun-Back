// src/services/createEmpleado.js
import { pool } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { createEmpresaUser } from '../models/empresaUsers.model.js';
import { sendWelcomeEmail } from '../utils/mailer.js';

export const crearEmpleadoDesdeEmpresa = async ({ name, apellido, email, empresa_id }) => {
  const passwordAuto = Math.random().toString(36).slice(-8); // 🔐 autogenerada
  const hash = await bcrypt.hash(passwordAuto, 10);

  const roleEmpleadoId = 6; // 👈 asegurate que este ID exista en tu tabla roles

  const result = await pool.query(
    `INSERT INTO users (name, last_name, email, password, role_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email`,
    [name, apellido, email, hash, roleEmpleadoId]
  );

  const user = result.rows[0];

  await createEmpresaUser({
    empresa_id,
    user_id: user.id,
    rol: 'empleado'
  });

  await sendWelcomeEmail(email, name, passwordAuto);

  return { ...user, password: passwordAuto };
};
