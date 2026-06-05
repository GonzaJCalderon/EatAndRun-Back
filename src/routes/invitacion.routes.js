// src/routes/invitacion.routes.js
import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { invitarEmpleadoPorCodigo } from '../controllers/empresa.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Invitation
 *   description: Gestión de códigos de invitación
 */

/**
 * @swagger
 * /api/invitacion/aceptar-codigo:
 *   post:
 *     summary: Aceptar código de invitación de empresa
 *     tags: [Invitation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitación aceptada
 */
router.post('/aceptar-codigo', verifyToken, invitarEmpleadoPorCodigo);

export default router;
