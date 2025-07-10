// src/routes/config.routes.js
import express from 'express';
import { getConfigController, setConfigController } from '../controllers/config.controller.js';
import { requireAdmin } from '../middlewares/auth.js'; // tu middleware de rol

const router = express.Router();

router.get('/:clave', getConfigController); // cualquiera puede leer
router.put('/:clave', requireAdmin, setConfigController); // solo admin puede modificar

export default router;
