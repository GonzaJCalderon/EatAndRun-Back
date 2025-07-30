import { pool } from '../db/index.js';
import dayjs from '../utils/dayjs.js'; 

export const getOrCreateSemanaActual = async () => {
  // 📅 Obtener lunes siguiente en hora ARG
  const lunes = dayjs().tz('America/Argentina/Buenos_Aires').startOf('week').add(8, 'day'); // lunes de la próxima semana
  const viernes = lunes.add(4, 'day');
  const cierre = viernes.hour(20).minute(0).second(0); // viernes a las 20:00hs

  const lunesISO = lunes.format('YYYY-MM-DD');

  // 🔍 Buscar si ya existe
  const existente = await pool.query(
    `SELECT * FROM menu_semana WHERE semana_inicio = $1`,
    [lunesISO]
  );

  if (existente.rows.length > 0) {
    const semana = existente.rows[0];

    if (!semana.semana_fin || !semana.cierre || !semana.dias_habilitados) {
      const update = await pool.query(`
        UPDATE menu_semana
        SET semana_fin = $1,
            cierre = $2,
            dias_habilitados = COALESCE(dias_habilitados, $3)
        WHERE id = $4
        RETURNING *
      `, [
        viernes.format('YYYY-MM-DD'),
        cierre.toISOString(),
        {
          lunes: true,
          martes: true,
          miercoles: true,
          jueves: true,
          viernes: true
        },
        semana.id
      ]);

      return update.rows[0];
    }

    return semana; // ya existe
  }

  // 🆕 Insertar nueva semana
  const insert = await pool.query(`
    INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre, dias_habilitados, inicio_toma_pedidos)
    VALUES ($1, $2, true, $3, $4, $5)
    RETURNING *
  `, [
    lunes.format('YYYY-MM-DD'),
    viernes.format('YYYY-MM-DD'),
    cierre.toISOString(),
    {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true
    },
    dayjs().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD') // toma de pedidos desde hoy
  ]);

  return insert.rows[0];
};



export const actualizarSemanaCompletaService = async (fecha_inicio, fecha_fin, cierre) => {
  const existente = await pool.query(
    'SELECT * FROM menu_semana WHERE semana_inicio = $1',
    [fecha_inicio]
  );

  if (existente.rows.length > 0) {
    return await pool.query(
      `UPDATE menu_semana
       SET semana_inicio = $1, semana_fin = $2, cierre = $3
       WHERE semana_inicio = $1
       RETURNING *`,
      [fecha_inicio, fecha_fin, cierre]
    );
  }

  return await pool.query(
    `INSERT INTO menu_semana (semana_inicio, semana_fin, cierre, habilitado)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [fecha_inicio, fecha_fin, cierre]
  );
};

// controllers/semana.controller.js
export const eliminarSemanaSiNoTienePedidos = async (req, res) => {
  const { id } = req.params;

  try {
    const tienePedidos = await pool.query(
      `SELECT COUNT(*) FROM pedidos WHERE semana_id = $1`,
      [id]
    );

    if (parseInt(tienePedidos.rows[0].count) > 0) {
      return res.status(400).json({ error: "La semana tiene pedidos y no se puede eliminar." });
    }

    await pool.query(`DELETE FROM menu_semana WHERE id = $1`, [id]);

    return res.json({ message: "Semana eliminada exitosamente." });
  } catch (error) {
    console.error("❌ Error al eliminar semana:", error);
    return res.status(500).json({ error: "Error al eliminar semana" });
  }
};
