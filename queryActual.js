import { pool } from './src/db/index.js'; 
async function run() { 
  try {
    const res = await pool.query("SELECT * FROM user_profiles WHERE user_id = (SELECT id FROM users WHERE email = 'gonzacalderon13788@gmail.com')");
    console.log(res.rows);
  } catch (err) {
    console.error(e);
  }
  process.exit(0); 
} 
run();
