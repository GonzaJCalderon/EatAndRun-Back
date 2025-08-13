import { pool } from '../db/index.js';
import dayjs from '../utils/dayjs.js'; // tu wrapper con tz/locale

const TZ = 'America/Argentina/Buenos_Aires';

// helpers: a "date-only"
const toDateOnly = (s) => dayjs(s).format('YYYY-MM-DD');
const isoToDateOnly = (s) => dayjs.utc(s).format('YYYY-MM-DD'); // por si llega ISO con Z

export const getOrCreateSemanaActual = async () => {
  // 📅 Próximo lunes (con weekStart=1 ya es lunes)
  const hoy = dayjs().tz(TZ).startOf('day');
  const lunesProx = hoy.startOf('week').add(7, 'day'); // ← 7 días, no 8
  const viernesProx = lunesProx.add(4, 'day');

  // Usamos DATE puro (string YYYY-MM-DD)
  const lunesStr   = lunesProx.format('YYYY-MM-DD');
  const viernesStr = viernesProx.format('YYYY-MM-DD');
  const cierreStr  = viernesStr; // si querés hora 20:00 real, avisá y lo paso a TIMESTAMP

  // 🔍 Buscar si ya existe (comparando DATE)
  const existente = await pool.query(
    `SELECT * FROM menu_semana WHERE semana_inicio = $1::date`,
    [lunesStr]
  );

  if (existente.rows.length > 0) {
    const semana = existente.rows[0];

    // completar campos faltantes, tipando correctamente
    if (!semana.semana_fin || !semana.cierre || !semana.dias_habilitados) {
      const update = await pool.query(
        `
        UPDATE menu_semana
        SET semana_fin = $1::date,
            cierre = $2::date,
            dias_habilitados = COALESCE(dias_habilitados, $3::jsonb)
        WHERE id = $4
        RETURNING *
        `,
        [
          viernesStr,
          cierreStr,
          JSON.stringify({
            lunes: true, martes: true, miercoles: true, jueves: true, viernes: true
          }),
          semana.id
        ]
      );
      return update.rows[0];
    }

    return semana; // ya está completa
  }

  // 🆕 Insertar nueva semana (todo bien tipado)
  const insert = await pool.query(
    `
    INSERT INTO menu_semana (
      semana_inicio, semana_fin, habilitado, cierre, dias_habilitados, inicio_toma_pedidos
    )
    VALUES ($1::date, $2::date, true, $3::date, $4::jsonb, $5::date)
    RETURNING *
    `,
    [
      lunesStr,
      viernesStr,
      cierreStr,
      JSON.stringify({
        lunes: true, martes: true, miercoles: true, jueves: true, viernes: true
      }),
      hoy.format('YYYY-MM-DD') // toma de pedidos desde hoy
    ]
  );

  return insert.rows[0];
};

export const actualizarSemanaCompletaService = async (fecha_inicio, fecha_fin, cierre) => {
  // Normalizar lo que venga (puede venir ISO con Z desde el front)
  const fi = /^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio) ? fecha_inicio : isoToDateOnly(fecha_inicio);
  const ff = /^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)    ? fecha_fin    : isoToDateOnly(fecha_fin);
  const ci = /^\d{4}-\d{2}-\d{2}$/.test(cierre)       ? cierre       : isoToDateOnly(cierre);

  // ¿existe por semana_inicio = fi?
  const existente = await pool.query(
    'SELECT id FROM menu_semana WHERE semana_inicio = $1::date',
    [fi]
  );

  if (existente.rows.length > 0) {
    return pool.query(
      `
      UPDATE menu_semana
      SET semana_inicio = $1::date,
          semana_fin    = $2::date,
          cierre        = $3::date
      WHERE semana_inicio = $1::date
      RETURNING *
      `,
      [fi, ff, ci]
    );
  }

  return pool.query(
    `
    INSERT INTO menu_semana (semana_inicio, semana_fin, cierre, habilitado)
    VALUES ($1::date, $2::date, $3::date, false)
    RETURNING *
    `,
    [fi, ff, ci]
  );
};

// (Si este bloque realmente vive acá, lo podés dejar.
//  Solo tipamos por prolijidad; tu versión de controller ya lo maneja mejor.)
export const eliminarSemanaSiNoTienePedidos = async (req, res) => {
  const { id } = req.params;

  try {
    const tienePedidos = await pool.query(
      `SELECT COUNT(*) FROM pedidos WHERE semana_id = $1`,
      [id]
    );

    if (parseInt(tienePedidos.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: "La semana tiene pedidos y no se puede eliminar." });
    }

    await pool.query(`DELETE FROM menu_semana WHERE id = $1`, [id]);

    return res.json({ message: "Semana eliminada exitosamente." });
  } catch (error) {
    console.error("❌ Error al eliminar semana:", error);
    return res.status(500).json({ error: "Error al eliminar semana" });
  }
};
