import { pool } from '../db/index.js';

import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

import {
  getEmpresaInfo,
  getEmpleadosByEmpresa,
  agregarEmpleadoPorEmail,
  getLinkInvitacionEmpresa,
  regenerateLinkInvitacionEmpresa, // 👈 agregamos esta
  getPedidosDeMiEmpresa,
  getEmpresaByUserId
} from '../controllers/empresa.controller.js';

import { crearEmpleadoDesdeEmpresa } from '../services/createEmpleado.js';



const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Empresa
 *   description: Gestión corporativa
 */

// 🔐 Proteger todas las rutas con token y rol 'empresa'
router.use(verifyToken);
router.use(authorizeRoles('empresa'));

// 🏢 Obtener info de mi empresa
/**
 * @swagger
 * /api/empresa/mi-empresa:
 *   get:
 *     summary: Obtener información de mi empresa
 *     tags: [Empresa]
 *     responses:
 *       200:
 *         description: Información de la empresa
 */
router.get('/mi-empresa', getEmpresaInfo);

// 👥 Ver empleados de mi empresa
/**
 * @swagger
 * /api/empresa/empleados:
 *   get:
 *     summary: Obtener empleados de la empresa
 *     tags: [Empresa]
 *     responses:
 *       200:
 *         description: Lista de empleados
 */
router.get('/empleados', getEmpleadosByEmpresa);

// ➕ Crear empleado nuevo directamente desde empresa
/**
 * @swagger
 * /api/empresa/empleados/nuevo:
 *   post:
 *     summary: Crear un nuevo empleado
 *     tags: [Empresa]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - apellido
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               apellido:
 *                 type: string
 *     responses:
 *       201:
 *         description: Empleado creado
 */
router.post('/empleados/nuevo', async (req, res) => {
  try {
    const { name, apellido, email } = req.body;
    const userId = req.user.id;

    const empresa = await getEmpresaByUserId(userId);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });

    const empleado = await crearEmpleadoDesdeEmpresa({
      name,
      apellido,
      email,
      empresa_id: empresa.id
    });

    res.status(201).json({ message: 'Empleado creado', empleado });
  } catch (err) {
    console.error('❌ Error creando empleado:', err);
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

// 🔗 Obtener link de invitación (crea si no existe)
/**
 * @swagger
 * /api/empresa/link-invitacion:
 *   get:
 *     summary: Obtener enlace de invitación
 *     tags: [Empresa]
 *     responses:
 *       200:
 *         description: Enlace de invitación
 */
router.get('/link-invitacion', getLinkInvitacionEmpresa);

// 🔁 Regenerar link de invitación
/**
 * @swagger
 * /api/empresa/regenerar-link:
 *   post:
 *     summary: Regenerar enlace de invitación
 *     tags: [Empresa]
 *     responses:
 *       200:
 *         description: Nuevo enlace
 */
router.post('/regenerar-link', regenerateLinkInvitacionEmpresa); // 👈 importante para evitar el error de red

// 📦 Ver pedidos de empleados de la empresa
/**
 * @swagger
 * /api/empresa/pedidos:
 *   get:
 *     summary: Obtener pedidos de los empleados
 *     tags: [Empresa]
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
router.get('/pedidos', getPedidosDeMiEmpresa);

// ➖ Eliminar empleado de empresa
// ➖ Eliminar empleado de empresa y de la tabla de usuarios si corresponde
// ➖ Eliminar empleado de empresa y de la tabla de usuarios si corresponde
/**
 * @swagger
 * /api/empresa/eliminar-empleado/{id}:
 *   delete:
 *     summary: Remover empleado de la empresa
 *     tags: [Empresa]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Empleado removido
 */
router.delete('/eliminar-empleado/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const empresaRes = await pool.query(
      'SELECT id FROM empresas WHERE user_id = $1',
      [req.user.id]
    );

    if (empresaRes.rowCount === 0) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const empresaId = empresaRes.rows[0].id;

    // ✅ Primero, eliminar relación en empresa_users
    const deleteRelation = await pool.query(
      `DELETE FROM empresa_users WHERE empresa_id = $1 AND user_id = $2 RETURNING *`,
      [empresaId, userId]
    );

    if (deleteRelation.rowCount === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado en tu empresa' });
    }

    // 🔍 Verificar si ese usuario pertenece a alguna otra empresa
    const checkOtherEmpresas = await pool.query(
      'SELECT * FROM empresa_users WHERE user_id = $1',
      [userId]
    );

    if (checkOtherEmpresas.rowCount === 0) {
      // 🧹 No pertenece a ninguna otra empresa → borrar el usuario
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }

    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar empleado:', err);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});


export default router;
