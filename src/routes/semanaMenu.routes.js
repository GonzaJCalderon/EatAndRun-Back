import { Router } from 'express';
import { getSemanaActualController, toggleSemanaHabilitadaController, actualizarCierreSemanaController, actualizarSemanaCompleta } from '../controllers/menu.controller.js';

const router = Router();

router.get('/actual', getSemanaActualController);
// 🔧 Nueva ruta para habilitar / deshabilitar semana
router.put('/habilitar', toggleSemanaHabilitadaController);
// 🔧 Nueva ruta para actualizar fecha de cierre
router.put('/cierre', actualizarCierreSemanaController);
router.put('/', actualizarSemanaCompleta);

export default router;
