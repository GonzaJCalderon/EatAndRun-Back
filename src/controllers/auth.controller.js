import { register, login } from '../services/auth.service.js';
import { createUserProfile } from '../models/userProfile.model.js';
import { createEmpresa } from '../models/empresa.model.js';

// ✅ REGISTRO DE USUARIO
export const registerController = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      telefono,
      direccion_principal,
      direccion_alternativa,
      empresa
    } = req.body;

    const roleMap = {
      1: 1, // usuario
      2: 2, // empresa
      3: 5, // delivery
      4: 4  // admin
    };

    const role_id = roleMap[role] || 1;

    const user = await register({ name, email, password, role_id });

  await createUserProfile({
  user_id: user.id,
  telefono: telefono || '',
  direccion_principal: direccion_principal || '',
  direccion_alternativa: direccion_alternativa || '',
  apellido: null
});


    if (role === 'empresa' && empresa) {
      await createEmpresa({
        user_id: user.id,
        razon_social: empresa.razonSocial,
        cuit: empresa.cuit
      });
    }

    res.status(201).json({ message: 'Usuario creado', user });
  } catch (err) {
    console.error('❌ Error en registerController:', err);
    res.status(400).json({ error: err.message });
  }
};

// ✅ LOGIN DE USUARIO
export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await login(email, password); // login ya devuelve el role como string

    res.json(result); // ✅ usamos el objeto directamente
  } catch (err) {
    console.error('❌ Error en loginController:', err);
    res.status(401).json({ error: err.message });
  }
};
