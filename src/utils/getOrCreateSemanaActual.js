import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';

export const getOrCreateSemanaActual = async () => {
  const lunes = getLunesProximaSemana();
  const lunesISO = lunes.toISOString().slice(0, 10);

  const existente = await pool.query(
    'SELECT * FROM menu_semana WHERE semana_inicio = $1',
    [lunesISO]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0];
  }

  const insert = await pool.query(
    `INSERT INTO menu_semana (semana_inicio, habilitado, cierre)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [lunesISO, false, null]
  );

  return insert.rows[0];
};
