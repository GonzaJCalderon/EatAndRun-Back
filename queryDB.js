import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, semana_inicio, semana_fin FROM menu_semana ORDER BY semana_inicio ASC"); 
  console.log('Semanas:', res.rows); 
  process.exit(0); 
} 
run();
