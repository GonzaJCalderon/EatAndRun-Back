import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, user_id, fecha_entrega, total FROM orders ORDER BY fecha_entrega DESC LIMIT 10"); 
  console.log('Ultimos pedidos:', res.rows); 
  process.exit(0); 
} 
run();
