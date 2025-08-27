// src/controllers/image.controller.js
import { cloudinary } from '../utils/cloudinary.js';

// src/controllers/image.controller.js
export const subirImagenMenuController = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

    res.status(200).json({ imageUrl: req.file.path });
  } catch (err) {
    console.error('❌ Error al subir imagen del menú:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
};

export const subirImagenTartaController = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

// controller
res.status(200).json({ secure_url: req.file.path });

  } catch (err) {
    console.error('❌ Error al subir imagen de tarta:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
};

