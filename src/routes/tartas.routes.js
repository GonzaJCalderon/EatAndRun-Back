import express from 'express';
import {
  listarTartas,
  crearTarta,
  editarTarta,
  eliminarTarta
} from '../controllers/tartas.controller.js';

const router = express.Router();

router.get('/', listarTartas);
router.post('/', crearTarta);
router.put('/:id', editarTarta);
router.delete('/:id', eliminarTarta);

export default router;
