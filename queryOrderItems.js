import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM order_items WHERE order_id = 216"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
