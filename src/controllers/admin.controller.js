import {
  getAllUsers as getAllUsersQuery,
  updateUserRole as updateUserRoleQuery,
  findUserByEmail,
  createUser,
} from '../models/user.model.js';
import {
  getPedidosPorEmpresa as getPedidosPorEmpresaModel
} from '../models/order.model.js';

import { createEmpresa } from '../models/empresa.model.js';
import { pool } from '../db/index.js';
import { crearEmpleadoGenerico } from '../controllers/empresa.controller.js';



// ✅ Obtener todos los usuarios (opcional por rol)
export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const allUsers = await getAllUsersQuery();
    const filtered = role ? allUsers.filter(u => u.rol === role) : allUsers;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
  }
};

// ✅ Crear empresa nueva

// ✅ Crear empresa nueva
export const crearEmpresa = async (req, res) => {
  try {
    const { nombre, responsable_email, cuit } = req.body;

    if (!nombre || !responsable_email) {
      return res.status(400).json({ error: 'Campos incompletos: nombre y responsable_email requeridos' });
    }

    let user = await findUserByEmail(responsable_email);
    if (!user) {
      user = await createUser({
        name: nombre,
        email: responsable_email,
        password: 'temporal123',
        role_id: 2 // empresa
      });
    }

    const empresaCreada = await createEmpresa({
      user_id: user.id,
      razon_social: nombre,
      cuit: cuit || null
    });

    res.status(201).json({
      message: '✅ Empresa creada correctamente',
      empresa: empresaCreada
    });

  } catch (error) {
    console.error('❌ Error al crear empresa:', error);
    res.status(500).json({ error: 'Error interno al crear empresa' });
  }
};


// ✅ Obtener todas las empresas
export const getTodasLasEmpresas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.razon_social AS nombre,
        e.codigo_invitacion,
        e.codigo_expira,
        e.cuit,
        u.name AS responsable_nombre,
        u.email AS responsable_email
      FROM empresas e
      JOIN users u ON u.id = e.user_id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener empresas:", err);
    res.status(500).json({ error: 'Error interno al obtener empresas' });
  }
};

// ✅ Obtener empresa por ID (con empleados)
export const getEmpresaById = async (req, res) => {
  const id = Number(req.params.id);

  if (!id) return res.status(400).json({ error: 'ID inválido' });

  try {
    const empresaRes = await pool.query(`
      SELECT 
        e.id,
        e.razon_social AS nombre,
        e.cuit,
        e.codigo_invitacion,
        e.codigo_expira,
        u.name AS responsable_nombre,
        u.email AS responsable_email
      FROM empresas e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (empresaRes.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const empleadosRes = await pool.query(`
      SELECT u.id, u.name, u.last_name AS apellido, u.email, eu.rol
      FROM empresa_users eu
      JOIN users u ON eu.user_id = u.id
      WHERE eu.empresa_id = $1
    `, [id]);

    res.json({
      ...empresaRes.rows[0],
      empleados: empleadosRes.rows
    });
  } catch (err) {
    console.error('❌ Error al obtener empresa:', err);
    res.status(500).json({ error: 'Error interno al obtener empresa' });
  }
};

// ✅ Actualizar empresa
export const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cuit, direccion, telefono } = req.body;

    // Verificar que exista
    const empresa = await pool.query(`SELECT * FROM empresas WHERE id = $1`, [id]);
    if (empresa.rowCount === 0) return res.status(404).json({ error: 'Empresa no encontrada' });

    // Actualizar
    const update = await pool.query(`
      UPDATE empresas 
      SET razon_social = $1, cuit = $2, direccion = $3, telefono = $4 
      WHERE id = $5 
      RETURNING *
    `, [nombre, cuit, direccion, telefono, id]);

    res.json({ message: 'Empresa actualizada', empresa: update.rows[0] });
  } catch (err) {
    console.error('❌ Error al actualizar empresa:', err);
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
};

// ✅ Eliminar empresa
export const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`DELETE FROM empresas WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json({ message: 'Empresa eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar empresa:', err);
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
};

// ✅ Crear usuario admin
export const createUserAdmin = async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  const roleMap = { usuario: 1, empresa: 2, delivery: 3, admin: 4 };
  const role_id = roleMap[rol];

  if (!nombre || !email || !password || !role_id) {
    return res.status(400).json({ error: "Campos incompletos o rol inválido" });
  }

  try {
    const nuevo = await createUser({ name: nombre, email, password, role_id });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// ✅ Eliminar usuario por ID
export const deleteUserById = async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ message: '✅ Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ✅ Actualizar empleado (admin)
export const actualizarEmpleado = async (req, res) => {
  const { id } = req.params;
  const { name, apellido, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, last_name = $2, email = $3 
       WHERE id = $4 
       RETURNING *`,
      [name, apellido || null, email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ message: '✅ Empleado actualizado', empleado: result.rows[0] });
  } catch (err) {
    console.error('❌ Error al actualizar empleado:', err);
    res.status(500).json({ error: 'Error interno al actualizar empleado' });
  }
};


export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;

 const roleMap = {
  usuario: 1,
  empresa: 2,
  delivery: 3,
  admin: 4,
  moderador: 5, // ✅ ESTE FALTABA
  empleado: 6   // ✅ ESTE TAMBIÉN (si se usa)
};


  const role_id = roleMap[rol];
  if (!role_id) {
    return res.status(400).json({ error: 'Rol no permitido' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role_id = $1 WHERE id = $2 RETURNING *`,
      [role_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Rol actualizado correctamente', user: result.rows[0] });
  } catch (err) {
    console.error("❌ Error al actualizar rol:", err);
    res.status(500).json({ error: 'Error al actualizar rol del usuario' });
  }
};


export const getPedidosPorEmpresa = async (req, res) => {
  const { id } = req.params;
  const { desde, hasta } = req.query;

  try {
    // Si tenés filtros de fecha:
    // getPedidosPorEmpresa(empresaId, desde, hasta)
    // Pero tu modelo por ahora sólo acepta empresaId.
    const pedidos = await getPedidosPorEmpresaModel(id);

    // Si querés filtrar por fecha en backend (opcional)
    let pedidosFiltrados = pedidos;
    if (desde) {
      pedidosFiltrados = pedidosFiltrados.filter(p =>
        p.fecha && p.fecha >= desde
      );
    }
    if (hasta) {
      pedidosFiltrados = pedidosFiltrados.filter(p =>
        p.fecha && p.fecha <= hasta
      );
    }

    res.json(pedidosFiltrados);
  } catch (err) {
    console.error('❌ Error al obtener pedidos de empresa:', err);
    res.status(500).json({ error: 'Error interno al obtener pedidos de la empresa' });
  }
};

