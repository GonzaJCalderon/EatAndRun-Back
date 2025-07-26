import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';



export const getOrCreateSemanaActual = async () => {
  const lunes = getLunesProximaSemana(); // Ej: 2025-08-05
  lunes.setHours(0, 0, 0, 0);

  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4); // viernes de esa semana
  viernes.setHours(0, 0, 0, 0);

  const cierre = new Date(viernes);
  cierre.setHours(20, 0, 0, 0); // Viernes 20:00hs

  const lunesISO = lunes.toISOString().slice(0, 10);

  // Verificar si ya existe una semana con ese lunes
  const existente = await pool.query(
    `SELECT * FROM menu_semana WHERE semana_inicio = $1`,
    [lunesISO]
  );

  if (existente.rows.length > 0) {
    const semana = existente.rows[0];

    // ✅ Si falta info, la completamos
    if (!semana.semana_fin || !semana.cierre || !semana.dias_habilitados) {
      const update = await pool.query(`
        UPDATE menu_semana
        SET semana_fin = $1,
            cierre = $2,
            dias_habilitados = COALESCE(dias_habilitados, $3)
        WHERE id = $4
        RETURNING *
      `, [
        viernes.toISOString().slice(0, 10),
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

    // Ya existe y está completa
    return semana;
  }

  // No existe: insertamos una nueva
  const insert = await pool.query(`
    INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre, dias_habilitados)
    VALUES ($1, $2, true, $3, $4)
    RETURNING *
  `, [
    lunes.toISOString().slice(0, 10),
    viernes.toISOString().slice(0, 10),
    cierre.toISOString(),
    {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true
    }
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
