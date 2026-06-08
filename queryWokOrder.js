import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM order_items WHERE LOWER(item_name) LIKE '%wok%'"); 
  console.log(res.rows); 
  process.exit(0); 
} 
run();
