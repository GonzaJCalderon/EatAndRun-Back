import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { getAllUsers, updateUserRole, deleteUserById, getTodasLasEmpresas, crearEmpresa,createUserAdmin } from '../controllers/admin.controller.js';
import { crearEmpleadoGenerico } from '../controllers/empresa.controller.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.post('/users', createUserAdmin);

router.get('/empresas', getTodasLasEmpresas);
router.put('/users/:id/role', updateUserRole);

// ➕ Crear empleado para cualquier empresa
router.post('/empresas/empleados', async (req, res) => {
  try {
    const { empresa_id, name, apellido, email } = req.body;

    if (!empresa_id || !name || !apellido || !email) {
      return res.status(400).json({ error: 'Faltan datos del empleado' });
    }

    const empleado = await crearEmpleadoGenerico(empresa_id, { name, apellido, email });

    res.status(201).json({ message: 'Empleado creado', empleado });
  } catch (err) {
    console.error('❌ Error al crear empleado como admin:', err);
    res.status(500).json({ error: err.message || 'Error creando empleado' });
  }
})
router.post('/empresas', crearEmpresa);
// 👇 NUEVA RUTA
router.delete('/users/:id', deleteUserById);


export default router;
