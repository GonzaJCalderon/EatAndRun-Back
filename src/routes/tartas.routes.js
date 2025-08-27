import express from 'express';
import {
  listarTartas,
  crearTarta,
  eliminarTarta,
  editarTartaPorId  // Changed name
} from '../controllers/tartas.controller.js';

const router = express.Router();

router.get('/', listarTartas);
router.post('/', crearTarta);
router.delete('/:id', eliminarTarta);
router.put('/:id', editarTartaPorId); // Changed from /:key to /:id

export default router;