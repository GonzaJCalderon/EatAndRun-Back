export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const rawRole = req.user?.role;

    if (!rawRole) {
      return res.status(403).json({ error: 'Rol no encontrado en el token' });
    }

    const rolesMap = {
      1: "usuario",
      2: "empresa",
      3: "delivery",
      4: "admin",
      5: "moderador",
      6: "empleado" // ✅ NUEVO
    };

    const roleName = typeof rawRole === 'number' ? rolesMap[rawRole] : rawRole;

    if (!allowedRoles.includes(roleName)) {
      return res.status(403).json({ error: 'Acceso denegado para tu rol' });
    }

    next();
  };
};

export const requireAdmin = authorizeRoles('admin');
