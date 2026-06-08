import { pool } from './src/db/index.js'; 
async function run() { 
  const queries = ['menu_fixed', 'menu_daily', 'menu_extras', 'menu_especiales', 'tartas'];
  for (const table of queries) {
    try {
      const res = await pool.query(`SELECT * FROM ${table} WHERE LOWER(name) LIKE '%wok%' OR LOWER(name) LIKE '%arroz%' OR LOWER(gusto) LIKE '%wok%'`);
      if (res.rows.length) console.log(`${table}:`, res.rows);
    } catch (e) {
      if (e.message.includes('gusto')) {
         const res = await pool.query(`SELECT * FROM ${table} WHERE LOWER(name) LIKE '%wok%' OR LOWER(name) LIKE '%arroz%'`);
         if (res.rows.length) console.log(`${table}:`, res.rows);
      }
    }
  }
  process.exit(0); 
} 
run();
