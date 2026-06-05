import express from 'express';
import {
  subirImagenMenuController,
  subirImagenTartaController
} from '../controllers/image.controller.js';
import { uploadPlato, uploadTarta } from '../middlewares/upload.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Carga de imágenes
 */

// 📸 Imagen de platos (protegida)
/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     summary: Cargar imagen de plato
 *     tags: [Images]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen cargada
 */
router.post('/upload', verifyToken, uploadPlato.single('image'), subirImagenMenuController);

// 🥧 Imagen de tartas (sin auth opcional, o agregalo si querés protegerlo)
/**
 * @swagger
 * /api/images/tarta:
 *   post:
 *     summary: Cargar imagen de tarta
 *     tags: [Images]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen cargada
 */
router.post('/tarta', verifyToken, uploadTarta.single('image'), subirImagenTartaController);

export default router;
