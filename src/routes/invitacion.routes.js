// src/routes/invitacion.routes.js
import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { invitarEmpleadoPorCodigo } from '../controllers/empresa.controller.js';

const router = express.Router();

router.post('/aceptar-codigo', verifyToken, invitarEmpleadoPorCodigo);

export default router;
