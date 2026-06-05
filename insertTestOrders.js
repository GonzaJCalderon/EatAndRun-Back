import pg from 'pg';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const getSemanasActivas = async () => {
  const result = await pool.query(`
    SELECT * FROM semanas_activas 
    WHERE activo = true 
      AND menu_publicado = true
    ORDER BY semana_inicio ASC
  `);
  return result.rows;
};

const insertTestOrders = async () => {
  try {
    const usuariosRes = await pool.query('SELECT id, name, last_name FROM users LIMIT 2');
    if (usuariosRes.rows.length === 0) {
      console.log('No users found.');
      process.exit(1);
    }
    const user1 = usuariosRes.rows[0].id;

    // Calcular el LUNES de la PRÓXIMA SEMANA
    const hoy = new Date();
    const dia = hoy.getDay();
    const proximoLunes = new Date(hoy);
    proximoLunes.setDate(hoy.getDate() - ((dia + 6) % 7) + 7);
    
    // Fechas
    const formatD = (date) => date.toISOString().split('T')[0];
    const lunes = new Date(proximoLunes);
    const martes = new Date(proximoLunes); martes.setDate(martes.getDate() + 1);
    const miercoles = new Date(proximoLunes); miercoles.setDate(miercoles.getDate() + 2);

    console.log("Fechas a insertar:", { lunes: formatD(lunes), martes: formatD(martes), miercoles: formatD(miercoles) });

    // Vamos a insertar directamente en orders y order_items
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const resOrder = await client.query(`
        INSERT INTO orders (user_id, total, fecha_entrega, observaciones, status, tipo_menu)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [user1, 15000, lunes, "Prueba para prox semana", "pendiente", "usuario"]);
      
      const orderId = resOrder.rows[0].id;

      // items
      // (order_id, item_type, item_id, item_name, quantity, dia, precio_unitario, fecha_dia)
      await client.query(`
        INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, dia, fecha_dia)
        VALUES 
        ($1, 'fijo', 24, 'ID:24', 3, 'lunes', $2),
        ($1, 'fijo', 63, 'ID:63', 5, 'martes', $3),
        ($1, 'extra', 1, 'ID:1', 2, 'miércoles', $4),
        ($1, 'tarta', null, 'tarta-de-verdura', 4, 'jueves', $4)
      `, [orderId, lunes, martes, miercoles]);

      await client.query('COMMIT');
      console.log("Pedidos creados con OrderID", orderId);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
    } finally {
      client.release();
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

insertTestOrders();
