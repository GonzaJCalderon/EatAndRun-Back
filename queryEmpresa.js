import { pool } from './src/db/index.js'; 
async function run() { 
  const emp = await pool.query("SELECT id, razon_social, cuit, user_id FROM empresas");
  console.log('Empresas:', emp.rows);

  const eu = await pool.query("SELECT eu.*, u.name, u.last_name, u.email, u.role_id FROM empresa_users eu JOIN users u ON u.id = eu.user_id LIMIT 20");
  console.log('empresa_users:', eu.rows);
  
  process.exit(0); 
} 
run();
