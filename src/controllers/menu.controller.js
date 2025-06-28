import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';
import { getOrCreateSemanaActual, actualizarSemanaCompletaService  } from '../utils/getOrCreateSemanaActual.js';




export const getSemanaActualController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM menu_semana
      WHERE NOW()::date BETWEEN semana_inicio AND semana_fin
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    // ⚠️ No hay semana activa
    if (result.rows.length === 0) {
      return res.status(200).json({
        habilitado: false,
        mensaje: 'Semana no habilitada para pedidos',
        semana_inicio: null,
        semana_fin: null,
        cierre: null,
        yaCerro: false
      });
    }

    const semana = result.rows[0];
    const ahora = new Date();
    const yaCerro = semana.cierre && new Date(semana.cierre) < ahora;

    res.json({
      semana_inicio: semana.semana_inicio,
      semana_fin: semana.semana_fin,
      habilitado: semana.habilitado,
      cierre: semana.cierre,
      yaCerro
    });
  } catch (err) {
    console.error('❌ Error al obtener semana actual:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};




export const toggleSemanaHabilitadaController = async (req, res) => {
  try {
    if (!req.body || typeof req.body.habilitado !== 'boolean') {
      return res.status(400).json({ error: 'El valor de "habilitado" debe ser booleano' });
    }

    const { habilitado } = req.body;

    const semanaActual = await pool.query(`
      SELECT * FROM menu_semana
      WHERE NOW()::date BETWEEN semana_inicio AND semana_fin
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (semanaActual.rows.length === 0) {
      return res.status(404).json({ error: 'No hay semana activa actual para habilitar' });
    }

    const semanaId = semanaActual.rows[0].id;

    await pool.query(
      `UPDATE menu_semana SET habilitado = $1 WHERE id = $2`,
      [habilitado, semanaId]
    );

    res.json({ message: `Semana ${habilitado ? 'habilitada' : 'bloqueada'} correctamente` });
  } catch (error) {
    console.error('❌ Error al actualizar estado de la semana:', error);
    res.status(500).json({ error: 'Error interno al actualizar la semana' });
  }
};




export const actualizarCierreSemanaController = async (req, res) => {
  try {
    const { cierre } = req.body;

    if (!cierre) {
      return res.status(400).json({ error: 'La fecha de cierre es requerida' });
    }

    const semanaActual = await pool.query(`
      SELECT * FROM menu_semana
      WHERE NOW()::date = semana_inicio
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (semanaActual.rows.length === 0) {
      return res.status(404).json({ error: 'No hay semana activa actual' });
    }

    const semanaId = semanaActual.rows[0].id;

    await pool.query(`
      UPDATE menu_semana
      SET cierre = $1
      WHERE id = $2
    `, [cierre, semanaId]);

    res.json({ message: '✅ Fecha de cierre actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar fecha de cierre:', error);
    res.status(500).json({ error: 'Error interno al actualizar la fecha de cierre' });
  }
};

export const actualizarSemanaCompleta = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, cierre } = req.body;

    if (!fecha_inicio || !fecha_fin || !cierre) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await actualizarSemanaCompletaService(fecha_inicio, fecha_fin, cierre);

    // 👇 CAMBIO ACÁ: devolvemos directamente la fila actualizada
    res.json({
      message: 'Semana actualizada correctamente',
      semana: result.rows[0] // ✅ esto es lo que el frontend espera
    });
  } catch (err) {
    console.error('❌ Error en actualizarSemanaCompletaController:', err);
    res.status(500).json({ error: 'Error al actualizar semana', details: err.message });
  }
};
