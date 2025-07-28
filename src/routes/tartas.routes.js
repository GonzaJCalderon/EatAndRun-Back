import express from 'express';
import {
  listarTartas,
  crearTarta,
  eliminarTarta,
  editarTartaPorKey 
} from '../controllers/tartas.controller.js';

const router = express.Router();

router.get('/', listarTartas);
router.post('/', crearTarta);

router.delete('/:id', eliminarTarta);
router.put('/:key', editarTartaPorKey);


export default router;
