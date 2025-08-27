// controllers/tartas.controller.js
import { pool } from '../db/index.js';
import {
  getAllTartas,
  createTarta,
  updateTarta,
  deleteTarta
} from '../models/tartas.model.js';

export const listarTartas = async (req, res) => {
  try {
    const tartas = await getAllTartas();
    res.json(tartas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tartas' });
  }
};

export const crearTarta = async (req, res) => {
  try {
    console.log('➡️ Recibido en crearTarta:', req.body);
    const nueva = await createTarta(req.body);
    res.status(201).json(nueva);
  } catch (err) {
    console.error('❌ Error crear tarta:', err);
    res.status(400).json({ error: 'Error al crear tarta', detail: err.message });
  }
};

export const eliminarTarta = async (req, res) => {
  try {
    await deleteTarta(req.params.id);
    res.json({ message: 'Tarta eliminada' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar tarta' });
  }
};

// Updated function to work with ID instead of key
export const editarTartaPorId = async (req, res) => {
  const { id } = req.params;
  
  try {
    const tartaActualizada = await updateTarta(id, req.body);
    
    if (!tartaActualizada) {
      return res.status(404).json({ error: 'Tarta no encontrada con ese ID' });
    }

    res.json(tartaActualizada);
  } catch (err) {
    console.error('❌ Error al editar tarta por ID:', err);
    res.status(400).json({ error: 'Error al editar tarta', detail: err.message });
  }
};