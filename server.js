import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { pool } from './src/db/index.js';

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

const app = express();

// ✅ CORS configurado para producción
const allowedOrigins = [
  'https://eatandrun.shop',    // 👈 tu frontend en Hostinger
  'http://localhost:5173'      // 👈 útil para desarrollo local
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (como Postman) o verificadas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`⛔ CORS: Origen no permitido -> ${origin}`));
    }
  },
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

// ✅ Ruta raíz
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Eat and Run API is running</h1>
    <p>✔️ Backend listo para recibir peticiones</p>
  `);
});

// ❌ Ruta 404 para todo lo demás
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada 😕' });
});

// ✅ Iniciar servidor
app.listen(config.port, () => {
  console.log(`🚀 Server running at http://localhost:${config.port}`);
});
