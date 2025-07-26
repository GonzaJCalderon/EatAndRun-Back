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

router.get('/', verifyToken, getFixedMenu);

// ✅ corregido
router.post(
  '/',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'),
  createFixedItem
);


router.put(
  '/:id',
  verifyToken,
  authorizeRoles('admin', 'moderador'),
  uploadPlato.single('image'), // 👈 AÑADILO AQUÍ
  updateFixedItem
);
router.delete('/:id', verifyToken, authorizeRoles('admin', 'moderador'), deleteFixedItem);
// En lugar de repetir /fixed
router.get('/by-role', verifyToken, getFixedMenuByRole);



export default router;
