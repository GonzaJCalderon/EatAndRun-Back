// src/models/semanas.model.js
import { pool } from '../db/index.js';

import dayjs from '../utils/tiempo.js';

export async function getSemanasActivas() {
  try {
    const { rows } = await pool.query(`
      SELECT id, semana_inicio, semana_fin, habilitado, dias_habilitados, cierre
      FROM menu_semana
      WHERE habilitado = TRUE
      ORDER BY semana_inicio ASC
    `);

    // 🔒 devolver "date-only" como string para evitar saltos por TZ en el front
    return rows.map(s => ({
      id: s.id,
      habilitado: s.habilitado,
      dias_habilitados: s.dias_habilitados,
      semana_inicio: dayjs(s.semana_inicio).format('YYYY-MM-DD'),
      semana_fin:    dayjs(s.semana_fin).format('YYYY-MM-DD'),
      cierre:        s.cierre ? dayjs(s.cierre).format('YYYY-MM-DD') : null,
    }));
  } catch (err) {
    if (err?.code === '42P01') {
      // Fallback: semana actual Lun–Vie, también como strings "YYYY-MM-DD"
      const hoy = new Date();
      const dia = hoy.getDay(); // 0..6
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dia + 6) % 7));
      const viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
      return [{
        id: null,
        habilitado: true,
        dias_habilitados: null,
        semana_inicio: dayjs(lunes).format('YYYY-MM-DD'),
        semana_fin:    dayjs(viernes).format('YYYY-MM-DD'),
        cierre: null,
      }];
    }
    throw err;
  }
}
