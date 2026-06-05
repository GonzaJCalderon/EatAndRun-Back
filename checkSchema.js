import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const run = async () => {
  const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fecha_entrega'");
  console.log(result.rows);
  process.exit(0);
};

run();
