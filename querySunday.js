import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT id, user_id, fecha_entrega, total FROM orders WHERE fecha_entrega = '2026-06-07'"); 
  console.log('Pedidos domingo:', res.rows); 
  process.exit(0); 
} 
run();
