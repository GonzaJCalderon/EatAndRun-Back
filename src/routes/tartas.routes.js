import express from 'express';
import {
  listarTartas,
  crearTarta,
  eliminarTarta,
  editarTartaPorId  // Changed name
} from '../controllers/tartas.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tartas
 *   description: Gestión de tartas
 */

/**
 * @swagger
 * /api/tartas:
 *   get:
 *     summary: Obtener todas las tartas
 *     tags: [Tartas]
 *     responses:
 *       200:
 *         description: Lista de tartas
 *   post:
 *     summary: Crear una tarta
 *     tags: [Tartas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gusto
 *             properties:
 *               gusto:
 *                 type: string
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tarta creada
 */
router.get('/', listarTartas);
router.post('/', crearTarta);

/**
 * @swagger
 * /api/tartas/{id}:
 *   delete:
 *     summary: Eliminar una tarta
 *     tags: [Tartas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarta eliminada
 *   put:
 *     summary: Actualizar una tarta
 *     tags: [Tartas]
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
 *     responses:
 *       200:
 *         description: Tarta actualizada
 */
router.delete('/:id', eliminarTarta);
router.put('/:id', editarTartaPorId); // Changed from /:key to /:id

export default router;