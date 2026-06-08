import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT * FROM orders LIMIT 1"); 
  console.log(Object.keys(res.rows[0])); 
  process.exit(0); 
} 
run();
