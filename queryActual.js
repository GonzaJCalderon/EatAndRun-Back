import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, semana_inicio, semana_fin, habilitado FROM menu_semana WHERE CURRENT_DATE BETWEEN semana_inicio AND semana_fin ORDER BY semana_inicio DESC LIMIT 1"); 
  console.log('Semana Actual Query:', res.rows); 
  process.exit(0); 
} 
run();
