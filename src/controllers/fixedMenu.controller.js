// /controllers/fixedMenu.controller.js

import {
  getAllFixedMenu,
  createFixedMenuItem,
  updateFixedMenuItem,
  deleteFixedMenuItem,
  getFixedMenuForRole
} from '../models/fixedMenu.model.js';

export const getFixedMenu = async (req, res) => {
  const items = await getAllFixedMenu();
  res.json(items);
};


// controllers/fixedMenu.controller.js

export const createFixedItem = async (req, res) => {
  console.log('💡 LLEGO A createFixedItem');
  console.log('body:', req.body);
  console.log('file:', req.file);

  try {
    const { name, description, price, for_role, image_url, available_days } = req.body;

    const imageUrl = req.file?.path || image_url || null;
    let parsedDays = null;
    if (available_days) {
      try {
        parsedDays = JSON.parse(available_days);
      } catch (e) {
        parsedDays = null;
      }
    }

    const item = await createFixedMenuItem({
      name,
      description,
      price,
      for_role,
      image_url: imageUrl,
      available_days: parsedDays
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('❌ Error al crear plato fijo:', err);
    res.status(500).json({ error: 'Error al crear el plato' });
  }
};

export const updateFixedItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, available_days } = req.body;
    const image_url = req.file?.path || req.body.image_url || null;

    let parsedDays = undefined;
    if (available_days) {
      try {
        parsedDays = JSON.parse(available_days);
      } catch (e) {
        parsedDays = undefined;
      }
    }

    const fieldsToUpdate = {
      name,
      description,
      price,
      image_url
    };
    if (parsedDays !== undefined) fieldsToUpdate.available_days = parsedDays;

    const updated = await updateFixedMenuItem(id, fieldsToUpdate);

    res.json(updated);
  } catch (err) {
    console.error("❌ Error en updateFixedItem:", err);
    res.status(500).json({ error: 'Error al actualizar el plato' });
  }
};

export const deleteFixedItem = async (req, res) => {
  const { id } = req.params;
  await deleteFixedMenuItem(id);
  res.json({ message: 'Item eliminado' });
};

export const getFixedMenuByRole = async (req, res) => {
  const { role } = req.query;

  if (!['usuario', 'empresa'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido: debe ser usuario o empresa' });
  }

  try {
    const items = await getFixedMenuForRole(role);
    res.json(items);
  } catch (err) {
    console.error('❌ Error en getFixedMenuByRole:', err);
    res.status(500).json({ error: 'Error al obtener menú por rol' });
  }
};
