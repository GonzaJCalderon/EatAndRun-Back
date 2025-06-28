import express from 'express';
import {
  getDailyMenu,
  getAllDailyMenu,
  createDailyItem,
  updateDailyItem,
  deleteDailyItem,
  createDailyItemFromJson,
  saveWeeklyUserMenu,
  saveWeeklyCompanyMenu,
  getTodayDailyMenu,
  getSpecialMenuEmpresa,
  createOrUpdateSpecialMenu,
   updateSpecialMenuEmpresa //
} from '../controllers/dailyMenu.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js';

const router = express.Router();

// 👤 Usuario / Empresa / Admin: ver su menú del día
// 👤 Usuario / Empresa / Admin: ver su menú del día
router.get('/', verifyToken, authorizeRoles('usuario', 'empresa', 'admin', 'delivery'), getDailyMenu);

// 🛠️ Admin: obtener todos los menús (sin filtro)
router.get('/all', verifyToken, authorizeRoles('admin','delivery'), getAllDailyMenu);


// ✅ Crear nuevo plato (con imagen)
router.post(
  '/daily',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  createDailyItem
);

// ✅ Editar plato (con imagen)
router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateDailyItem
);

// 🗑️ Eliminar plato
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteDailyItem);

// 📥 Crear plato desde JSON (sin imagen)
router.post(
  '/json',
  verifyToken,
  authorizeRoles('admin'),
  createDailyItemFromJson
);

// 📅 Guardar menú semanal para usuarios
router.put('/usuario', verifyToken, authorizeRoles('admin'), saveWeeklyUserMenu);

// 🏢 Guardar menú semanal para empresa
router.put('/empresa', verifyToken, authorizeRoles('admin'), saveWeeklyCompanyMenu);

// 📝 Actualizar menú especial existente
router.put(
  '/empresa/especial/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'), // acepta imagen
  updateSpecialMenuEmpresa
);


// 📆 Obtener menú del día actual (por rol)
router.get('/today', verifyToken, getTodayDailyMenu);



// 📋 Empresa/Admin obtiene menú especial
router.get(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('empresa', 'admin'),
  getSpecialMenuEmpresa
);

// 🧩 Admin crea o actualiza menú especial de empresa
// routes/menu.routes.js
router.post(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'), // NUEVO middleware
  createOrUpdateSpecialMenu
);


export default router;
