import express from 'express';
import { exportKitchenExcel } from '../controllers/kitchenReport.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// Solo admin o moderador puede exportar
router.get('/kitchen-excel', verifyToken, authorizeRoles('admin', 'moderador'), exportKitchenExcel);

export default router;
