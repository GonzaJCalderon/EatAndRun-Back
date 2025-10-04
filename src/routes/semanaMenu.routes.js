import express from 'express';
import {
  getSemanaActualController,
  toggleSemanaHabilitadaController,
  actualizarDiasHabilitadosController,
  actualizarCierreSemanaController,
  actualizarSemanaCompleta,
  putSemana,
  crearSemanaSiNoExisteController,
  getSemanasHabilitadasController,
  getSemanasDisponiblesParaPedidosController,
  eliminarSemanaSiNoTienePedidos,
  crearSemanaPuraController,
  getSemanaProximaController,
  getTodasLasSemanasController
} from '../controllers/menu.controller.js'; // ✅ Asegurate que el path es correcto

const router = express.Router();

// 📅 SEMANA ACTUAL
router.get('/actual', getSemanaActualController);
router.get('/proxima', getSemanaProximaController);


// 🔛 SEMANAS HABILITADAS
router.get('/activas', getSemanasHabilitadasController);

// ✅ SEMANAS DISPONIBLES PARA PEDIDOS
router.get('/disponibles', getSemanasDisponiblesParaPedidosController);

router.get('/todas', getTodasLasSemanasController);

// ➕ CREAR NUEVA SEMANA (o PUT si ya existe)
router.post('/', putSemana);
router.put('/', putSemana);

// routes
router.put('/actualizar', actualizarSemanaCompleta);

router.post('/pura', crearSemanaPuraController); // ya lo tenés


// 🟢 HABILITAR / DESHABILITAR
router.put('/habilitar', toggleSemanaHabilitadaController);

// 🕒 ACTUALIZAR CIERRE
router.put('/cierre', actualizarCierreSemanaController);

// 📅 ACTUALIZAR DÍAS HABILITADOS
router.put('/dias', actualizarDiasHabilitadosController);

// 🗑️ ELIMINAR SEMANA (si no tiene pedidos)
router.delete('/:id', eliminarSemanaSiNoTienePedidos);

// (Opcional) Crear si no existe
router.post('/crear', crearSemanaSiNoExisteController);

export default router;
