import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const run = async () => {
  const client = await pool.connect();
  try {
    const userId = 2; 

    // Insertar un pedido diferente para miércoles y jueves
    const res = await client.query(`
      INSERT INTO orders (user_id, status, total, fecha_entrega, tipo_menu)
      VALUES ($1, 'pendiente', 15000, '2026-06-08 03:00:00+00', 'usuario')
      RETURNING id
    `, [userId]);
    const orderId = res.rows[0].id;

    // Items para el miércoles
    await client.query(`
      INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia)
      VALUES 
      ($1, 'fijo', 25, 'ID:25', 1, 'miércoles'),
      ($1, 'fijo', 26, 'ID:26', 2, 'miércoles'),
      ($1, 'extra', 2, 'ID:2', 1, 'jueves')
    `, [orderId]);

    console.log("Nuevos pedidos insertados correctamente con ID:", orderId);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    client.release();
    pool.end();
  }
};

run();
