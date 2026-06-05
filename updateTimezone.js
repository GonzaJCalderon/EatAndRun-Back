import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const update = async () => {
  try {
    const client = await pool.connect();
    await client.query("UPDATE orders SET fecha_entrega = '2026-06-08 15:00:00+00' WHERE id IN (213, 214)");
    console.log("Updated!");
    client.release();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

update();
