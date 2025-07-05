// routes/tartas.js
import express from 'express';
import {
  getAllTartas,
  createTarta,
  updateTarta,
  deleteTarta
} from '../models/tartas.model.js'; 

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tartas = await getAllTartas();
    res.json(tartas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tartas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const nueva = await createTarta(req.body);
    res.status(201).json(nueva);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear tarta', detail: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const actualizada = await updateTarta(req.params.id, req.body);
    res.json(actualizada);
  } catch (err) {
    res.status(400).json({ error: 'Error al editar tarta', detail: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteTarta(req.params.id);
    res.json({ message: 'Tarta eliminada' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar tarta' });
  }
});

export default router;
