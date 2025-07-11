export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;

    const roleMap = {
      1: "usuario",
      2: "empresa",
      3: "delivery",
      4: "admin",
      5: "moderador",
      6: "empleado"
    };

    const roleName = typeof role === 'number' ? roleMap[role] : role;

    if (!roleName || !allowedRoles.includes(roleName)) {
      return res.status(403).json({ error: 'Acceso denegado: rol no autorizado' });
    }

    next();
  };
};


export const requireAdmin = authorizeRoles('admin');
