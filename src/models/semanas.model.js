// src/models/semanas.model.js
import { pool } from '../db/index.js';

export async function getSemanasActivas() {
  try {
    const { rows } = await pool.query(`
      SELECT semana_inicio, semana_fin, habilitado, dias_habilitados, cierre
      FROM menu_semana
      WHERE habilitado = TRUE
      ORDER BY semana_inicio ASC
    `);

    return rows.map(s => ({
      ...s,
      semana_inicio: new Date(s.semana_inicio),
      semana_fin: new Date(s.semana_fin),
    }));
  } catch (err) {
    // 42P01 = la tabla no existe. Fallback a semana actual (lunes-viernes).
    if (err?.code === '42P01') {
      const hoy = new Date();
      const dia = hoy.getDay(); // 0..6
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dia + 6) % 7));
      const viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
      return [{
        semana_inicio: lunes,
        semana_fin: viernes,
        habilitado: true,
        dias_habilitados: null,
        cierre: null,
      }];
    }
    throw err;
  }
}
