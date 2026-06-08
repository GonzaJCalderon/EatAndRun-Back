import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM order_items WHERE order_id IN (214, 213)"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
