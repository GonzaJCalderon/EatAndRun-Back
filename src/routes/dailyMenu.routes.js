import express from 'express';
import {
  getDailyMenu,
  getAllDailyMenu,
  createDailyItem,
  updateDailyItem,
  deleteDailyItem,
  createDailyItemFromJson,
  saveWeeklyMenu, // ✅ reemplaza saveWeeklyUserMenu / saveWeeklyCompanyMenu
  getTodayDailyMenu,
  getSpecialMenuEmpresa,
  createOrUpdateSpecialMenu,
  updateSpecialMenuEmpresa,
  getWeeklyMenuGrouped
} from '../controllers/dailyMenu.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: DailyMenu
 *   description: Gestión del menú diario
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 */

// 👤 Todos los roles: ver su menú del día (ya no filtramos por rol)
/**
 * @swagger
 * /api/daily:
 *   get:
 *     summary: Obtener ítems del menú diario
 *     tags: [DailyMenu]
 *     responses:
 *       200:
 *         description: Lista de ítems del menú diario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyItem'
 */
router.get('/', verifyToken, authorizeRoles('usuario', 'empresa', 'admin', 'delivery'), getDailyMenu);

// 🛠️ Admin: obtener todos los platos sin filtro
/**
 * @swagger
 * /api/daily/all:
 *   get:
 *     summary: Obtener todos los ítems del menú diario (Admin)
 *     tags: [DailyMenu]
 *     responses:
 *       200:
 *         description: Lista completa de ítems del menú diario
 */
router.get('/all', verifyToken, authorizeRoles('admin', 'delivery'), getAllDailyMenu);

// ✅ Crear nuevo plato (con imagen)
/**
 * @swagger
 * /api/daily:
 *   post:
 *     summary: Crear ítem del menú diario
 *     tags: [DailyMenu]
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
 *               description:
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
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  createDailyItem
);

// ✅ Editar plato existente (con imagen)
/**
 * @swagger
 * /api/daily/{id}:
 *   put:
 *     summary: Actualizar ítem del menú diario
 *     tags: [DailyMenu]
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
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateDailyItem
);

// 🗑️ Eliminar un plato
/**
 * @swagger
 * /api/daily/{id}:
 *   delete:
 *     summary: Eliminar un ítem del menú diario
 *     tags: [DailyMenu]
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
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteDailyItem);

// 📥 Crear plato desde JSON (sin imagen)
router.post(
  '/json',
  verifyToken,
  authorizeRoles('admin'),
  createDailyItemFromJson
);

// 📦 Obtener menú semanal agrupado por día (para frontend)
/**
 * @swagger
 * /api/daily/semanal:
 *   get:
 *     summary: Obtener el menú semanal agrupado
 *     tags: [DailyMenu]
 *     responses:
 *       200:
 *         description: Menú agrupado
 */
router.get('/semanal', verifyToken, authorizeRoles('usuario', 'empresa', 'admin', 'delivery'), getWeeklyMenuGrouped);

// 📅 Guardar menú semanal (unificado, sin distinción de usuario/empresa)
/**
 * @swagger
 * /api/daily/semanal:
 *   put:
 *     summary: Guardar el menú semanal
 *     tags: [DailyMenu]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               menu:
 *                 type: object
 *     responses:
 *       200:
 *         description: Menú guardado
 */
router.put('/semanal', verifyToken, authorizeRoles('admin'), saveWeeklyMenu);

// 📆 Obtener menú del día actual (ya no se filtra por rol)
/**
 * @swagger
 * /api/daily/today:
 *   get:
 *     summary: Obtener el menú de hoy
 *     tags: [DailyMenu]
 *     responses:
 *       200:
 *         description: Menú de hoy
 */
router.get('/today', verifyToken, getTodayDailyMenu);

// 🧩 Menú especial para empresa (GET / POST / PUT)
router.get(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('empresa', 'admin'),
  getSpecialMenuEmpresa
);

router.post(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  createOrUpdateSpecialMenu
);

router.put(
  '/empresa/especial/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateSpecialMenuEmpresa
);

export default router;
