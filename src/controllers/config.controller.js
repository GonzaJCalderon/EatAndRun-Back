// src/controllers/config.controller.js
import { getConfig, setConfig } from '../models/config.model.js';

export const getConfigController = async (req, res) => {
  const clave = req.params.clave;
  const valor = await getConfig(clave);
  if (!valor) return res.status(404).json({ error: 'Configuración no encontrada' });
  res.json(valor);
};

export const setConfigController = async (req, res) => {
  const clave = req.params.clave;
  const valor = req.body;
  await setConfig(clave, valor);
  res.json({ ok: true });
};
