import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM menu_daily WHERE id IN (24, 25, 26, 63)"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
