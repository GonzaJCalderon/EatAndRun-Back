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

/**
 * @swagger
 * tags:
 *   - name: Admin - Empresas
 *     description: Gestión de empresas y sus empleados (Solo Admin)
 *   - name: Admin - Usuarios
 *     description: Gestión de todos los usuarios del sistema (Solo Admin)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         razon_social:
 *           type: string
 *         cuit:
 *           type: string
 *         direccion:
 *           type: string
 */

/**
 * @swagger
 * /api/admin/empresas:
 *   get:
 *     summary: Obtener todas las empresas
 *     tags: [Admin - Empresas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get('/empresas', getTodasLasEmpresas);              // 🔍 Listado de empresas

/**
 * @swagger
 * /api/admin/empresas/{id}:
 *   get:
 *     summary: Obtener empresa por ID
 *     tags: [Admin - Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles de la empresa
 *       404:
 *         description: Empresa no encontrada
 */
router.get('/empresas/:id', getEmpresaById);               // 🔍 Detalle de empresa

/**
 * @swagger
 * /api/admin/empresas:
 *   post:
 *     summary: Crear una nueva empresa
 *     tags: [Admin - Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razon_social
 *               - cuit
 *             properties:
 *               razon_social:
 *                 type: string
 *               cuit:
 *                 type: string
 *     responses:
 *       201:
 *         description: Empresa creada
 */
router.post('/empresas', crearEmpresa);                    // ➕ Crear empresa

/**
 * @swagger
 * /api/admin/empresas/{id}:
 *   put:
 *     summary: Actualizar una empresa
 *     tags: [Admin - Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razon_social:
 *                 type: string
 *               cuit:
 *                 type: string
 *     responses:
 *       200:
 *         description: Empresa actualizada
 */
router.put('/empresas/:id', actualizarEmpresa);            // ✏️ Actualizar empresa

/**
 * @swagger
 * /api/admin/empresas/{id}:
 *   delete:
 *     summary: Eliminar una empresa
 *     tags: [Admin - Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Empresa eliminada
 */
router.delete('/empresas/:id', eliminarEmpresa);           // 🗑️ Eliminar empresa

// 👥 Empleados (como admin)
/**
 * @swagger
 * /api/admin/empresas/empleados:
 *   post:
 *     summary: Agregar un empleado a una empresa
 *     tags: [Admin - Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - empresa_id
 *               - name
 *               - apellido
 *               - email
 *             properties:
 *               empresa_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Empleado creado
 */
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
/**
 * @swagger
 * /api/admin/empresas/{empresaId}/empleados/{userId}:
 *   delete:
 *     summary: Remover un empleado de una empresa
 *     tags: [Admin - Empresas]
 *     parameters:
 *       - in: path
 *         name: empresaId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Empleado removido
 */
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
/**
 * @swagger
 * /api/admin/empresas/{id}/pedidos:
 *   get:
 *     summary: Obtener pedidos por empresa
 *     tags: [Admin - Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos de la empresa
 */
router.get('/empresas/:id/pedidos', getPedidosPorEmpresa);


// ✏️ Editar datos de empleado (name, apellido, email)
/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Actualizar datos básicos de usuario/empleado
 *     tags: [Admin - Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/users/:id', actualizarEmpleado);

// 👤 Usuarios (admin puede gestionar todos)
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Admin - Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *   post:
 *     summary: Crear un usuario admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario admin creado
 */
router.get('/users', getAllUsers);                  // 🔍 Listar todos
router.post('/users', createUserAdmin);             // ➕ Crear nuevo user admin

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Actualizar rol de usuario
 *     tags: [Admin - Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rol actualizado
 */
router.put('/users/:id/role', updateUserRole);      // ✏️ Cambiar rol de usuario

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     tags: [Admin - Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/users/:id', deleteUserById);        // 🗑️ Eliminar usuario

export default router;
