import express from 'express';
import {
  getFixedMenu,
  createFixedItem,
  updateFixedItem,
  deleteFixedItem,
  getFixedMenuByRole,
} from '../controllers/fixedMenu.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js'; // ✅ corregido


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: FixedMenu
 *   description: Gestión de menú fijo
 */

/**
 * @swagger
 * /api/fixed:
 *   get:
 *     summary: Obtener ítems del menú fijo
 *     tags: [FixedMenu]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ítems fijos
 */
router.get('/', verifyToken, getFixedMenu);

// ✅ corregido
// ✅ corregido
/**
 * @swagger
 * /api/fixed:
 *   post:
 *     summary: Crear ítem del menú fijo
 *     tags: [FixedMenu]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ítem creado
 */
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'),
  createFixedItem
);


/**
 * @swagger
 * /api/fixed/{id}:
 *   put:
 *     summary: Actualizar ítem del menú fijo
 *     tags: [FixedMenu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Ítem actualizado
 */
router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'), // 👈 AÑADILO AQUÍ
  updateFixedItem
);
/**
 * @swagger
 * /api/fixed/{id}:
 *   delete:
 *     summary: Eliminar ítem del menú fijo
 *     tags: [FixedMenu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ítem eliminado
 */
router.delete('/:id', verifyToken, authorizeRoles('admin', 'moderador'), deleteFixedItem);
// En lugar de repetir /fixed
router.get('/by-role', verifyToken, getFixedMenuByRole);



export default router;
