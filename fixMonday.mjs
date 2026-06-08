import { pool } from './src/db/index.js';

async function fix() {
  await pool.query(`UPDATE menu_semana SET dias_habilitados = jsonb_set(dias_habilitados, '{lunes}', 'true')`);
  console.log('Fixed all mondays');
  process.exit(0);
}
fix();
