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
    console.log('➡️ Recibido en crearTarta:', req.body); // 👈
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


export const editarTartaPorKey = async (req, res) => {
  const { key } = req.params;
  const { precio } = req.body;

  try {
    const result = await pool.query(
      'UPDATE tartas SET precio = $1 WHERE key = $2 RETURNING *',
      [precio, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarta no encontrada con ese key' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al editar tarta por key:', err);
    res.status(400).json({ error: 'Error al editar tarta', detail: err.message });
  }
};


