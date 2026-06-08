import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, name FROM menu_daily"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
