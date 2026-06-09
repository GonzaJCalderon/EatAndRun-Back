import { pool } from './src/db/index.js';

async function check() {
  const { rows } = await pool.query(`
    SELECT u.id, u.name, eu.empresa_id, em.razon_social, o.tipo_menu
    FROM users u
    LEFT JOIN empresa_users eu ON u.id = eu.user_id
    LEFT JOIN empresas em ON em.id = eu.empresa_id
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.name ILIKE '%Carlos%'
  `);
  console.log(rows);
  process.exit(0);
}
check();
