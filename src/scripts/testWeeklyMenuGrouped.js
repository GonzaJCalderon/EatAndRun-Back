import dotenv from 'dotenv';
import dayjs from '../utils/dayjs.js'; // Usa tu configuración
import { pool } from '../db/index.js';
import { getWeeklyMenuGrouped } from '../controllers/dailyMenu.controller.js';

// Cargar variables de entorno (.env) si usás DATABASE_URL allí
dotenv.config();

const req = {}; // Simulado
const res = {
  json: (data) => {
    console.log('\n✅ Resultado de getWeeklyMenuGrouped:\n');
    for (const dia of Object.keys(data)) {
      const { fijos, especiales } = data[dia];
      console.log(`📅 ${dia.padEnd(10)} → ${fijos.length} fijos | ${especiales.length} especiales`);
    }
    pool.end(); // Cerrar conexión PostgreSQL
  },
  status: (code) => ({
    json: (data) => {
      console.error(`❌ Error (${code}):`, data);
      pool.end();
    }
  })
};

(async () => {
  console.log('🧪 Ejecutando test de getWeeklyMenuGrouped...\n');

  try {
    await getWeeklyMenuGrouped(req, res);
  } catch (err) {
    console.error('❌ Excepción inesperada:', err);
    pool.end();
  }
})();
