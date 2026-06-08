import { pool } from './src/db/index.js'; 
async function run() { 
  try {
    await pool.query("ALTER TABLE fixed_menu ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes']"); 
    console.log('Column added'); 
  } catch(e) {
    console.error(e);
  }
  process.exit(0); 
} 
run();
