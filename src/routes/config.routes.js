// src/routes/config.routes.js
import express from 'express';
import { getConfigController, setConfigController } from '../controllers/config.controller.js';
import { requireAdmin } from '../middlewares/role.middleware.js'; // tu middleware de rol
import { verifyToken } from '../middlewares/auth.middleware.js'; 
import { authorizeRoles } from '../middlewares/role.middleware.js'; // tu middleware de autorización

const router = express.Router();

router.get('/:clave', getConfigController); // cualquiera puede leer
router.put('/:clave', verifyToken, authorizeRoles('admin'), setConfigController);



export default router;
