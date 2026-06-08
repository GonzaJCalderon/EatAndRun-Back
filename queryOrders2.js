import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, user_id, fecha_entrega FROM orders ORDER BY id DESC LIMIT 5"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
