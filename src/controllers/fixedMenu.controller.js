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
  try {
    const { name, description, price, for_role } = req.body;

    const imageUrl = req.file?.path || null; // ✅ correcta obtención desde multer/cloudinary

    const item = await createFixedMenuItem({ name, description, price, for_role, image_url: imageUrl });
    res.status(201).json(item);
  } catch (err) {
    console.error('❌ Error al crear plato fijo:', err);
    res.status(500).json({ error: 'Error al crear el plato' });
  }
};



export const updateFixedItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    const image_url = req.file?.path || req.body.image_url || null;

    const updated = await updateFixedMenuItem(id, {
      name,
      description,
      price,
      image_url
    });

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

// ✅ CORRECTO
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



