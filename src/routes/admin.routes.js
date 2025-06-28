import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { getAllUsers, updateUserRole, deleteUserById } from '../controllers/admin.controller.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);

// 👇 NUEVA RUTA
router.delete('/users/:id', deleteUserById);

export default router;
