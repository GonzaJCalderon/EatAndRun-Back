import { pool } from '../db/index.js';

import { findUserByEmail, createUser } from '../models/user.model.js';
import { generarCodigoInvitacion } from '../models/empresa.model.js';
import {
  createEmpresaUser,
  isUserInEmpresa,
  removeEmpleado,
   encontrarEmpresaPorCodigo, 
   asociarEmpleadoAEmpresa
} from '../models/empresaUsers.model.js';
import { getPedidosPorEmpresa } from '../models/order.model.js'; 

// 🔍 Obtener info de la empresa actual del usuario logueado



// src/controllers/empresa.controller.js
export const crearEmpleadoDesdeEmpresa = async ({ name, apellido, email, empresa_id }) => {
  let user = await findUserByEmail(email);

  if (!user) {
    const res = await createUser({
  name,
  apellido, // ✅ BIEN
  email,
  password: 'temporal123',
  role_id: 6 // o el que uses para "empleado"
});

    user = res;
  }

  const yaExiste = await pool.query(
    `SELECT * FROM empresa_users WHERE empresa_id = $1 AND user_id = $2`,
    [empresa_id, user.id]
  );

  if (yaExiste.rowCount > 0) {
    throw new Error('El usuario ya pertenece a la empresa');
  }

  await createEmpresaUser({
    empresa_id,
    user_id: user.id,
    rol: 'empleado'
  });

  return user;
};


export const getEmpresaInfo = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM empresas WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al obtener empresa:', err);
    res.status(500).json({ error: 'Error interno al obtener empresa' });
  }
};



// ✉️ Agregar empleado a empresa por email
export const agregarEmpleadoPorEmail = async (req, res) => {
  const userId = req.user.id;
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    // Buscar empresa del responsable
    const empresaRes = await pool.query(
      'SELECT id FROM empresas WHERE user_id = $1',
      [userId]
    );

    if (empresaRes.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const empresaId = empresaRes.rows[0].id;

    // Verificar que el usuario exista
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no esté ya en esa empresa
    const existeRes = await pool.query(
      `SELECT * FROM empresa_users WHERE empresa_id = $1 AND user_id = $2`,
      [empresaId, user.id]
    );

    if (existeRes.rowCount > 0) {
      return res.status(400).json({ error: 'Este usuario ya pertenece a la empresa' });
    }

    // Asociar usuario a empresa como 'empleado'
    await createEmpresaUser({
      empresa_id: empresaId,
      user_id: user.id,
      rol: 'empleado'
    });

    res.status(201).json({ message: 'Empleado agregado a la empresa' });
  } catch (err) {
    console.error('❌ Error al agregar empleado:', err);
    res.status(500).json({ error: 'Error interno al agregar empleado' });
  }
};



export const getLinkInvitacionEmpresa = async (req, res) => {
  const userId = req.user.id;

  try {
    // Buscar empresa del usuario logueado
    const result = await pool.query(
      `SELECT id, codigo_invitacion, codigo_expira FROM empresas WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No sos responsable de ninguna empresa' });
    }

    let { id: empresaId, codigo_invitacion, codigo_expira } = result.rows[0];

    // Si no hay código o está vencido → generar uno nuevo
    const now = new Date();
    if (!codigo_invitacion || !codigo_expira || new Date(codigo_expira) < now) {
      const generado = await generarCodigoInvitacion(empresaId);
      codigo_invitacion = generado.codigo;
      codigo_expira = generado.expira;
    }

    // Devolvemos el link completo
    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    const link = `${baseUrl}/registro?empresa=${codigo_invitacion}`;

    res.json({
      link,
      codigo: codigo_invitacion,
      expira: codigo_expira
    });
  } catch (err) {
    console.error('❌ Error al generar link de invitación:', err);
    res.status(500).json({ error: 'No se pudo generar el link de invitación' });
  }
};

// 👤 Vincular usuario con empresa usando código de invitación
export const invitarEmpleadoPorCodigo = async (req, res) => {
  const userId = req.user.id;
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ error: 'Código de invitación requerido' });
  }

  try {
    const empresa = await encontrarEmpresaPorCodigo(codigo);

    if (!empresa) {
      return res.status(404).json({ error: 'Código inválido o empresa no encontrada' });
    }

    if (empresa.codigo_expira && new Date(empresa.codigo_expira) < new Date()) {
      return res.status(400).json({ error: 'El código ha expirado' });
    }

    // Verificamos que el usuario no esté ya asociado
    const yaAsociado = await isUserInEmpresa(empresa.id, userId);
    if (yaAsociado) {
      return res.status(200).json({ message: 'Ya estás vinculado a esta empresa' });
    }

    // Asociar al usuario como empleado
    await asociarEmpleadoAEmpresa({
      empresa_id: empresa.id,
      user_id: userId,
      rol: 'empleado'
    });

    res.status(201).json({ message: '✅ Usuario vinculado a la empresa' });
  } catch (err) {
    console.error('❌ Error al usar código de invitación:', err);
    res.status(500).json({ error: 'Error interno al procesar el código' });
  }
};

// ✅ Obtener empleados de la empresa actual
export const getEmpleadosByEmpresa = async (req, res) => {
  const userId = req.user.id;

  try {
    const empresaRes = await pool.query(
      'SELECT id FROM empresas WHERE user_id = $1',
      [userId]
    );

    if (empresaRes.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const empresaId = empresaRes.rows[0].id;

    const empleadosRes = await pool.query(`
      SELECT u.id, u.name, u.last_name AS apellido, u.email, eu.rol
      FROM empresa_users eu
      JOIN users u ON eu.user_id = u.id
      WHERE eu.empresa_id = $1
    `, [empresaId]);

    res.json(empleadosRes.rows);
  } catch (err) {
    console.error('❌ Error al obtener empleados:', err);
    res.status(500).json({ error: 'Error interno al obtener empleados' });
  }
};

// 📦 Obtener pedidos de todos los empleados de la empresa
export const getPedidosDeMiEmpresa = async (req, res) => {
  const userId = req.user.id;

  try {
    const empresaRes = await pool.query(
      'SELECT id FROM empresas WHERE user_id = $1',
      [userId]
    );

    if (empresaRes.rowCount === 0) {
      return res.status(404).json({ error: 'No sos responsable de ninguna empresa' });
    }

    const empresaId = empresaRes.rows[0].id;

    const pedidos = await getPedidosPorEmpresa(empresaId); // 💡 ¡Usás la lógica ya construida!
    res.json(pedidos);
  } catch (err) {
    console.error('❌ Error al obtener pedidos corporativos:', err);
    res.status(500).json({ error: 'Error interno al obtener pedidos' });
  }
};


// 🔑 Generar código único para invitación
const generarCodigoUnico = () => {
  return Math.random().toString(36).substring(2, 10);
};

export const regenerateLinkInvitacionEmpresa = async (req, res) => {
  try {
    const empresa = await getEmpresaByUserId(req.user.id);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const nuevoCodigo = generarCodigoUnico();
    const nuevaExpiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await pool.query(
      `UPDATE empresas SET codigo_invitacion = $1, codigo_expira = $2 WHERE id = $3`,
      [nuevoCodigo, nuevaExpiracion, empresa.id]
    );

    const baseUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    res.json({
      link: `${baseUrl}/registro?empresa=${nuevoCodigo}`,
      expira: nuevaExpiracion
    });
  } catch (err) {
    console.error('❌ Error al regenerar link:', err);
    res.status(500).json({ error: 'No se pudo regenerar el link' });
  }
};

// 🔍 Obtener empresa desde el ID del usuario (por ej. para creaciones internas)
export const getEmpresaByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM empresas WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]; // null si no existe
};


// src/controllers/empresa.controller.js
export const crearEmpleadoGenerico = async (empresaId, empleadoInfo) => {
  const { name, apellido, email } = empleadoInfo;

  const empleado = await crearEmpleadoDesdeEmpresa({
    name,
    apellido,
    email,
    empresa_id: empresaId
  });

  return empleado;
};


