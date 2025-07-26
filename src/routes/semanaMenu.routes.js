import { Router } from 'express';
import { getSemanaActualController, 
    toggleSemanaHabilitadaController, 
    actualizarCierreSemanaController, 
    actualizarSemanaCompleta,
     actualizarDiasHabilitadosController,
      crearSemanaSiNoExisteController, 
      getSemanasHabilitadasController  } from '../controllers/menu.controller.js';

const router = Router();

router.get('/actual', getSemanaActualController);
// 🔧 Nueva ruta para habilitar / deshabilitar semana
router.put('/habilitar', toggleSemanaHabilitadaController);
// 🔧 Nueva ruta para actualizar fecha de cierre
router.put('/cierre', actualizarCierreSemanaController);
router.put('/', actualizarSemanaCompleta);
router.put('/dias', actualizarDiasHabilitadosController);


router.post('/crear-auto', crearSemanaSiNoExisteController);

router.get('/activas', getSemanasHabilitadasController);


export default router;
