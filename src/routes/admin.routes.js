import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { getAllUsers, updateUserRole, deleteUserById, getTodasLasEmpresas, crearEmpresa,createUserAdmin } from '../controllers/admin.controller.js';


const router = express.Router();

router.use(verifyToken, authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.post('/users', createUserAdmin);

router.get('/empresas', getTodasLasEmpresas);
router.put('/users/:id/role', updateUserRole);


router.post('/empresas', crearEmpresa);
// 👇 NUEVA RUTA
router.delete('/users/:id', deleteUserById);


export default router;
