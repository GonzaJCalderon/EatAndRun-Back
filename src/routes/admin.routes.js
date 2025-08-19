import express from 'express';
import { pool } from '../db/index.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

import {
  getTodasLasEmpresas,
  getEmpresaById,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  createUserAdmin,
  deleteUserById,
  getAllUsers,
  updateUserRole,
  actualizarEmpleado,
  getPedidosPorEmpresa
} from '../controllers/admin.controller.js';

import { crearEmpleadoGenerico } from '../controllers/empresa.controller.js';

const router = express.Router();

// 🛡️ Middleware: Token + Rol admin
router.use(verifyToken, authorizeRoles('admin'));

// 📁 Empresas
router.get('/empresas', getTodasLasEmpresas);              // 🔍 Listado de empresas
router.get('/empresas/:id', getEmpresaById);               // 🔍 Detalle de empresa
router.post('/empresas', crearEmpresa);                    // ➕ Crear empresa
router.put('/empresas/:id', actualizarEmpresa);            // ✏️ Actualizar empresa
router.delete('/empresas/:id', eliminarEmpresa);           // 🗑️ Eliminar empresa

// 👥 Empleados (como admin)
router.post('/empresas/empleados', async (req, res) => {
  try {
    const { empresa_id, name, apellido, email } = req.body;

    if (!empresa_id || !name || !apellido || !email) {
      return res.status(400).json({ error: 'Faltan datos del empleado' });
    }

    const empleado = await crearEmpleadoGenerico(empresa_id, { name, apellido, email });

    res.status(201).json({ message: 'Empleado creado', empleado });
  } catch (err) {
    console.error('❌ Error al crear empleado como admin:', err);
    res.status(500).json({ error: err.message || 'Error creando empleado' });
  }
});

// 🗑️ Eliminar empleado (de empresa y posiblemente de la tabla users)
router.delete('/empresas/:empresaId/empleados/:userId', async (req, res) => {
  const empresaId = parseInt(req.params.empresaId);
  const userId = parseInt(req.params.userId);

  if (!empresaId || !userId) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  try {
    const rel = await pool.query(
      'DELETE FROM empresa_users WHERE empresa_id = $1 AND user_id = $2 RETURNING *',
      [empresaId, userId]
    );

    if (rel.rowCount === 0) {
      return res.status(404).json({ error: 'No se encontró esa relación empresa-empleado' });
    }

    const restante = await pool.query(
      'SELECT * FROM empresa_users WHERE user_id = $1',
      [userId]
    );

    if (restante.rowCount === 0) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    res.json({ message: '✅ Empleado eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar empleado:', err);
    res.status(500).json({
      error: 'Error al eliminar empleado',
      detail: err.message
    });
  }
});
// routes/admin.routes.js
router.get('/empresas/:id/pedidos', getPedidosPorEmpresa);


// ✏️ Editar datos de empleado (name, apellido, email)
router.put('/users/:id', actualizarEmpleado);

// 👤 Usuarios (admin puede gestionar todos)
router.get('/users', getAllUsers);                  // 🔍 Listar todos
router.post('/users', createUserAdmin);             // ➕ Crear nuevo user admin
router.put('/users/:id/role', updateUserRole);      // ✏️ Cambiar rol de usuario
router.delete('/users/:id', deleteUserById);        // 🗑️ Eliminar usuario

export default router;
