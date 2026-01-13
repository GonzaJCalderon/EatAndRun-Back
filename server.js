import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { pool } from './src/db/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

import authRoutes from './src/routes/auth.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import fixedMenuRoutes from './src/routes/fixedMenu.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import dailyMenuRoutes from './src/routes/dailyMenu.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import deliveryRoutes from './src/routes/delivery.routes.js';
import kitchenReportRoutes from './src/routes/kitchenReport.routes.js';
import kitchenOrderRoutes from './src/routes/kitchenOrder.routes.js';
import userProfileRoutes from './src/routes/userProfile.routes.js';
import imageRoutes from './src/routes/image.routes.js';
import semanaMenuRoutes from './src/routes/semanaMenu.routes.js';
import tartasRoutes from './src/routes/tartas.routes.js';
import empresaRoutes from './src/routes/empresa.routes.js';
import invitacionRoutes from './src/routes/invitacion.routes.js';
import configRoutes from './src/routes/config.routes.js';
import menuRoutes from './src/routes/menu.routes.js';

const app = express();

// ✅ CORS configurado para producción
const allowedOrigins = [
  'https://eatandrun.shop',    // 👈 tu frontend en Hostinger
  'http://localhost:5173',     // 👈 útil para desarrollo local
  'http://localhost:4000',     // 👈 para que el Swagger local pueda pegar a producción
  'https://eatandrun-back-production.up.railway.app' // 👈 por seguridad propia
];

app.use(cors({
  origin: true, // 👈 Permite cualquier origen para que el swagger.html compartido funcione
  credentials: true
}));

// ✅ Middleware para JSON
app.use(express.json());

// 🔍 Logging de cada request
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ Rutas API
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', deliveryRoutes);
app.use('/api/reports', kitchenReportRoutes);
app.use('/api/kitchen/orders', kitchenOrderRoutes);
app.use('/api/users', userProfileRoutes)
app.use('/api/fixed', fixedMenuRoutes);     
app.use('/api/daily', dailyMenuRoutes);
app.use('/api/semana', semanaMenuRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/perfil', userProfileRoutes);
app.use('/api/tartas', tartasRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/invitacion', invitacionRoutes);
app.use('/api/config', configRoutes);
app.use('/api/menu', menuRoutes);

// ✅ Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ✅ Ruta raíz
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Eat and Run API is running</h1>
    <p>✔️ Backend listo para recibir peticiones</p>
  `);
});
app.get('/debug-tz', (req, res) => {
  const now = new Date();
  res.json({
    date: now.toString(),
    iso: now.toISOString(),
    tzOffset: now.getTimezoneOffset(),
  });
});


// ❌ Ruta 404 para todo lo demás
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada 😕' });
});

// ✅ Iniciar servidor
app.listen(config.port, () => {
  console.log(`🚀 Server running at http://localhost:${config.port}`);
});
