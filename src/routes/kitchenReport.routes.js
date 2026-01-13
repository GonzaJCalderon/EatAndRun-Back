import express from 'express';
import {
  exportKitchenExcel,
  exportProduccionSemanal
} from '../controllers/kitchenReport.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Endpoints de reportes
 */

// Solo admin o moderador puede exportar
/**
 * @swagger
 * /api/reports/kitchen-excel:
 *   get:
 *     summary: Exportar reporte de cocina a Excel
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Archivo Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/kitchen-excel', verifyToken, authorizeRoles('admin', 'moderador'), exportKitchenExcel);

// Nueva ruta para exportar Producción Semanal
/**
 * @swagger
 * /api/reports/produccion-semanal:
 *   get:
 *     summary: Exportar reporte de producción semanal
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Archivo de reporte
 */
router.get(
  '/produccion-semanal',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  exportProduccionSemanal
);


export default router;
