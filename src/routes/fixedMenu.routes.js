import express from 'express';
import {
  getFixedMenu,
  createFixedItem,
  updateFixedItem,
  deleteFixedItem,
  getFixedMenuByRole,
} from '../controllers/fixedMenu.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { uploadPlato } from '../middlewares/upload.middleware.js'; // ✅ corregido


const router = express.Router();

router.get('/fixed', verifyToken, getFixedMenu);

router.post(
  '/fixed',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'), // ✅ corregido
  createFixedItem
);

router.put(
  '/fixed/:id',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'), // 👈 AÑADILO AQUÍ
  updateFixedItem
);
router.delete('/fixed/:id', verifyToken, authorizeRoles('admin', 'moderador'), deleteFixedItem);
// En lugar de repetir /fixed
router.get('/fixed/by-role', verifyToken, getFixedMenuByRole);



export default router;
