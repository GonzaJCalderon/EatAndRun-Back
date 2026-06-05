import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const run = async () => {
  const result = await pool.query("SELECT DISTINCT status FROM orders LIMIT 5");
  console.log(result.rows);
  process.exit(0);
};

run();
