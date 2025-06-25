import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';

export const getOrCreateSemanaActual = async () => {
  const lunes = getLunesProximaSemana();
  const lunesISO = lunes.toISOString().slice(0, 10);

  // buscamos si ya existe
  const existente = await pool.query(
    'SELECT * FROM menu_semana WHERE semana_inicio = $1',
    [lunesISO]
  );

  // si existe pero le falta semana_fin, la actualizamos
  if (existente.rows.length > 0) {
    const semana = existente.rows[0];

    if (!semana.semana_fin) {
      const viernes = new Date(lunes);
      viernes.setDate(lunes.getDate() + 4);
      const viernesISO = viernes.toISOString().slice(0, 10);

      const actualizada = await pool.query(
        `UPDATE menu_semana
         SET semana_fin = $1
         WHERE semana_inicio = $2
         RETURNING *`,
        [viernesISO, lunesISO]
      );

      return actualizada.rows[0];
    }

    return semana;
  }

  // si no existe, la insertamos correctamente
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);
  const viernesISO = viernes.toISOString().slice(0, 10);

  const insert = await pool.query(
    `INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [lunesISO, viernesISO, false, null]
  );

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
