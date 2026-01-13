import express from 'express';
import { getWeeklyMenuGrouped } from '../controllers/dailyMenu.controller.js';


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: Operaciones generales de menú
 */

/**
 * @swagger
 * /api/menu/semana:
 *   get:
 *     summary: Obtener el menú semanal agrupado por día
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Estructura del menú semanal
 */
router.get('/semana', getWeeklyMenuGrouped); // 🔥 nuevo endpoint

export default router;

