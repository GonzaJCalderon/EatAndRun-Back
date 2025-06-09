import { Router } from 'express';
import { getSemanaActualController, toggleSemanaHabilitadaController, actualizarCierreSemanaController } from '../controllers/menu.controller.js';

const router = Router();

router.get('/semana/actual', getSemanaActualController);
// 🔧 Nueva ruta para habilitar / deshabilitar semana
router.put('/semana/habilitar', toggleSemanaHabilitadaController);
// 🔧 Nueva ruta para actualizar fecha de cierre
router.put('/semana/cierre', actualizarCierreSemanaController);

export default router;
