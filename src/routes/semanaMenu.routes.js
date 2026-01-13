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

/**
 * @swagger
 * tags:
 *   name: SemanaMenu
 *   description: Configuración de semanas de menú
 */

// 📅 SEMANA ACTUAL
/**
 * @swagger
 * /api/semana/actual:
 *   get:
 *     summary: Obtener información de la semana actual
 *     tags: [SemanaMenu]
 *     responses:
 *       200:
 *         description: Detalles de la semana actual
 */
router.get('/actual', getSemanaActualController);

/**
 * @swagger
 * /api/semana/proxima:
 *   get:
 *     summary: Obtener información de la próxima semana
 *     tags: [SemanaMenu]
 *     responses:
 *       200:
 *         description: Detalles de la próxima semana
 */
router.get('/proxima', getSemanaProximaController);


// 🔛 SEMANAS HABILITADAS
/**
 * @swagger
 * /api/semana/activas:
 *   get:
 *     summary: Obtener semanas activas
 *     tags: [SemanaMenu]
 *     responses:
 *       200:
 *         description: Lista de semanas activas
 */
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
/**
 * @swagger
 * /api/semana/habilitar:
 *   put:
 *     summary: Cambiar estado habilitado de la semana
 *     tags: [SemanaMenu]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Estado cambiado
 */
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
