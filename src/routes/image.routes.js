import express from 'express';
import {
  subirImagenMenuController,
  subirImagenTartaController
} from '../controllers/image.controller.js';
import { uploadPlato, uploadTarta } from '../middlewares/upload.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 📸 Imagen de platos (protegida)
router.post('/upload', verifyToken, uploadPlato.single('image'), subirImagenMenuController);

// 🥧 Imagen de tartas (sin auth opcional, o agregalo si querés protegerlo)
router.post('/tarta', verifyToken, uploadTarta.single('image'), subirImagenTartaController);

export default router;
