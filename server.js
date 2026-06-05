import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// ✅ Configuración de seguridad básica
app.use(helmet());

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
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Eat and Run API</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          text-align: center;
        }
        .container {
          padding: 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        h1 { font-size: 3rem; margin-bottom: 0.5rem; }
        p { font-size: 1.2rem; color: #a2a2d0; margin-bottom: 2rem; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background-color: #e94560;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          transition: transform 0.2s, background-color 0.2s;
        }
        .btn:hover {
          background-color: #ff4d6d;
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🍽️ Eat and Run API</h1>
        <p>El backend está funcionando correctamente.</p>
        <a href="/api-docs" class="btn">Ver Documentación de API</a>
      </div>
    </body>
    </html>
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
