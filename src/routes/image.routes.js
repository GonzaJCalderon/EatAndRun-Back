// src/routes/image.routes.js
import express from 'express';
import { subirImagenMenuController } from '../controllers/image.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post('/upload', verifyToken, uploadPlato.single('image'), subirImagenMenuController);

export default router;
