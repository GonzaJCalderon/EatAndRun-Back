import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM menu_fixed"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
