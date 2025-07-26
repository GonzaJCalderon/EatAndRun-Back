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
    console.log('➡️ Recibido en crearTarta:', req.body); // 👈
    const nueva = await createTarta(req.body);
    res.status(201).json(nueva);
  } catch (err) {
    console.error('❌ Error crear tarta:', err);
    res.status(400).json({ error: 'Error al crear tarta', detail: err.message });
  }
};


export const editarTarta = async (req, res) => {
  try {
    const actualizada = await updateTarta(req.params.id, req.body);
    res.json(actualizada);
  } catch (err) {
    res.status(400).json({ error: 'Error al editar tarta', detail: err.message });
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
