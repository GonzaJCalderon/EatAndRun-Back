import express from 'express';
import {
  getDailyMenu,
  getAllDailyMenu,
  createDailyItem,
  updateDailyItem,
  deleteDailyItem,
  createDailyItemFromJson,
  saveWeeklyMenu, // ✅ reemplaza saveWeeklyUserMenu / saveWeeklyCompanyMenu
  getTodayDailyMenu,
  getSpecialMenuEmpresa,
  createOrUpdateSpecialMenu,
  updateSpecialMenuEmpresa
} from '../controllers/dailyMenu.controller.js';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js';

const router = express.Router();

// 👤 Todos los roles: ver su menú del día (ya no filtramos por rol)
router.get('/', verifyToken, authorizeRoles('usuario', 'empresa', 'admin', 'delivery'), getDailyMenu);

// 🛠️ Admin: obtener todos los platos sin filtro
router.get('/all', verifyToken, authorizeRoles('admin', 'delivery'), getAllDailyMenu);

// ✅ Crear nuevo plato (con imagen)
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  createDailyItem
);

// ✅ Editar plato existente (con imagen)
router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateDailyItem
);

// 🗑️ Eliminar un plato
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteDailyItem);

// 📥 Crear plato desde JSON (sin imagen)
router.post(
  '/json',
  verifyToken,
  authorizeRoles('admin'),
  createDailyItemFromJson
);

// 📅 Guardar menú semanal (unificado, sin distinción de usuario/empresa)
router.put('/semanal', verifyToken, authorizeRoles('admin'), saveWeeklyMenu);

// 📆 Obtener menú del día actual (ya no se filtra por rol)
router.get('/today', verifyToken, getTodayDailyMenu);

// 🧩 Menú especial para empresa (GET / POST / PUT)
router.get(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('empresa', 'admin'),
  getSpecialMenuEmpresa
);

router.post(
  '/empresa/especial',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  createOrUpdateSpecialMenu
);

router.put(
  '/empresa/especial/:id',
  verifyToken,
  authorizeRoles('admin'),
  uploadPlato.single('image'),
  updateSpecialMenuEmpresa
);

export default router;
