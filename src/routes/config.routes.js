import express from 'express';
import { getPreciosController, setPreciosController } from '../controllers/config.controller.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 🛡️ Protección
router.use(verifyToken);

// Obtener los precios actuales
router.get('/precios', getPreciosController);

// Actualizar los precios (solo admin o moderador)
router.put('/precios', authorizeRoles('admin', 'moderador'), setPreciosController);

export default router;
