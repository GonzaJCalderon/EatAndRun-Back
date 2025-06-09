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
router.get('/daily', verifyToken, authorizeRoles('usuario', 'empresa', 'admin', 'delivery'), getDailyMenu);

// 🛠️ Admin: obtener todos los menús (sin filtro)
router.get('/daily/all', verifyToken, authorizeRoles('admin','delivery'), getAllDailyMenu);


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
  '/daily/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateDailyItem
);

// 🗑️ Eliminar plato
router.delete('/daily/:id', verifyToken, authorizeRoles('admin'), deleteDailyItem);

// 📥 Crear plato desde JSON (sin imagen)
router.post(
  '/daily/json',
  verifyToken,
  authorizeRoles('admin'),
  createDailyItemFromJson
);

// 📅 Guardar menú semanal para usuarios
router.put('/daily/usuario', verifyToken, authorizeRoles('admin'), saveWeeklyUserMenu);

// 🏢 Guardar menú semanal para empresa
router.put('/daily/empresa', verifyToken, authorizeRoles('admin'), saveWeeklyCompanyMenu);

// 📝 Actualizar menú especial existente
router.put(
  '/daily/empresa/especial/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'), // acepta imagen
  updateSpecialMenuEmpresa
);


// 📆 Obtener menú del día actual (por rol)
router.get('/daily/today', verifyToken, getTodayDailyMenu);



// 📋 Empresa/Admin obtiene menú especial
router.get(
  '/daily/empresa/especial',
  verifyToken,
  authorizeRoles('empresa', 'admin'),
  getSpecialMenuEmpresa
);

// 🧩 Admin crea o actualiza menú especial de empresa
// routes/menu.routes.js
router.post(
  '/daily/empresa/especial',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'), // NUEVO middleware
  createOrUpdateSpecialMenu
);


export default router;
