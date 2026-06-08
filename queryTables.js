import { pool } from './src/db/index.js'; 
async function run() { 
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"); 
  console.log(res.rows.map(x => x.table_name)); 
  process.exit(0); 
} 
run();
