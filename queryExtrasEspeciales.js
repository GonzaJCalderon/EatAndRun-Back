import { pool } from './src/db/index.js'; 
async function run() { 
  const resExtra = await pool.query("SELECT * FROM menu_extras WHERE id IN (24,25,26,63)"); 
  const resEspec = await pool.query("SELECT * FROM menu_especiales WHERE id IN (24,25,26,63)");
  console.log('Extras:', resExtra.rows); 
  console.log('Especiales:', resEspec.rows); 
  process.exit(0); 
} 
run();
