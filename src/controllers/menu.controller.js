import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';
import { getOrCreateSemanaActual, actualizarSemanaCompletaService } from '../utils/getOrCreateSemanaActual.js';



export const getSemanaActualController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
      FROM menu_semana
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({
        id: null,
        habilitado: false,
        mensaje: 'Semana no habilitada para pedidos',
        semana_inicio: null,
        semana_fin: null,
        cierre: null,
        yaCerro: false,
        dias_habilitados: {
          lunes: false,
          martes: false,
          miercoles: false,
          jueves: false,
          viernes: false
        }
      });
    }

    const semana = result.rows[0];
    const ahora = new Date();
    const yaCerro = semana.cierre && new Date(semana.cierre) < ahora;

    const parseDias = (value) => {
      const fallback = {
        lunes: false,
        martes: false,
        miercoles: false,
        jueves: false,
        viernes: false
      };
      if (!value) return fallback;
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(value);
      } catch (err) {
        console.warn('⚠️ No se pudo parsear dias_habilitados:', value);
        return fallback;
      }
    };

    const dias_habilitados = parseDias(semana.dias_habilitados);

    return res.json({
      id: semana.id, // 👈 NECESARIO PARA EL FRONTEND
      semana_inicio: semana.semana_inicio,
      semana_fin: semana.semana_fin,
      cierre: semana.cierre,
      habilitado: semana.habilitado,
      yaCerro,
      dias_habilitados
    });
  } catch (err) {
    console.error('❌ Error al obtener semana actual:', err);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const toggleSemanaHabilitadaController = async (req, res) => {
  try {
    const { id, habilitado } = req.body;

    if (!id || typeof habilitado !== 'boolean') {
      return res.status(400).json({ error: 'Debe enviarse id y habilitado como booleano' });
    }

    const result = await pool.query(
      `UPDATE menu_semana SET habilitado = $1 WHERE id = $2 RETURNING *`,
      [habilitado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Semana no encontrada' });
    }

    res.json({
      message: `Semana ${habilitado ? 'habilitada' : 'bloqueada'} correctamente`,
      semana: result.rows[0]
    });
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

    res.json({
      message: 'Semana actualizada correctamente',
      semana: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error en actualizarSemanaCompletaController:', err);
    res.status(500).json({ error: 'Error al actualizar semana', details: err.message });
  }
};

export const actualizarDiasHabilitadosController = async (req, res) => {
  try {
    const { dias_habilitados } = req.body;

    if (!dias_habilitados || typeof dias_habilitados !== 'object') {
      return res.status(400).json({ error: 'Se requiere un objeto con los días habilitados' });
    }

    const semanaActual = await pool.query(`
      SELECT id FROM menu_semana
      WHERE NOW()::date BETWEEN semana_inicio AND semana_fin
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (semanaActual.rows.length === 0) {
      return res.status(404).json({ error: 'No hay semana activa' });
    }

    const semanaId = semanaActual.rows[0].id;

    await pool.query(`
      UPDATE menu_semana
      SET dias_habilitados = $1
      WHERE id = $2
    `, [dias_habilitados, semanaId]);

    res.json({ message: '✅ Días habilitados actualizados correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar días habilitados:', error);
    res.status(500).json({ error: 'Error interno al actualizar los días habilitados' });
  }
};

export const crearSemanaSiNoExisteController = async (req, res) => {
  try {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
    lunes.setHours(0, 0, 0, 0);

    const viernes = new Date(lunes);
    viernes.setDate(lunes.getDate() + 4);
    viernes.setHours(0, 0, 0, 0);

    const cierre = new Date(viernes);
    cierre.setHours(20, 0, 0, 0);

    const result = await pool.query(`
      SELECT * FROM menu_semana
      WHERE semana_inicio = $1
    `, [lunes]);

    if (result.rows.length > 0) {
      return res.json({ message: 'Semana ya existe', semana: result.rows[0] });
    }

    const dias_habilitados = {
      lunes: true,
      martes: true,
      miercoles: true,
      jueves: true,
      viernes: true
    };

    const insertResult = await pool.query(`
      INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre, dias_habilitados)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [lunes, viernes, true, cierre, dias_habilitados]);

    res.status(201).json({ message: '✅ Semana creada correctamente', semana: insertResult.rows[0] });
  } catch (error) {
    console.error('❌ Error al crear semana:', error);
    res.status(500).json({ error: 'Error interno al crear semana' });
  }
};

export const getSemanasHabilitadasController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM menu_semana
      WHERE habilitado = true
      AND cierre > NOW()
      ORDER BY semana_inicio ASC
    `);

    res.json({ semanas: result.rows });
  } catch (err) {
    console.error('❌ Error al obtener semanas activas:', err);
    res.status(500).json({ error: 'Error al obtener semanas activas' });
  }
};



export const getSemanasDisponiblesParaPedidosController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM menu_semana
      WHERE inicio_toma_pedidos <= CURRENT_DATE
        AND cierre > NOW()
        AND habilitado = true
      ORDER BY semana_inicio ASC
    `);

    return res.json({ semanas: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener semanas con pedidos disponibles:', error);
    return res.status(500).json({ error: 'Error interno al obtener semanas disponibles' });
  }
};

export const eliminarSemanaSiNoTienePedidos = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID de semana requerido' });
  }

  try {
    // 1. Obtener semana por ID
    const semanaResult = await pool.query(`
      SELECT semana_inicio, semana_fin FROM menu_semana WHERE id = $1
    `, [id]);

    if (semanaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Semana no encontrada' });
    }

    const { semana_inicio, semana_fin } = semanaResult.rows[0];

    // 2. Verificar si hay pedidos en ese rango de fechas
    const pedidos = await pool.query(`
      SELECT COUNT(*) FROM orders
      WHERE fecha_entrega BETWEEN $1 AND $2
    `, [semana_inicio, semana_fin]);

    const totalPedidos = parseInt(pedidos.rows[0].count, 10);

    if (totalPedidos > 0) {
      return res.status(400).json({
        error: '⚠️ No se puede eliminar la semana: hay pedidos en el rango de fechas'
      });
    }

    // 3. Eliminar semana
    await pool.query(`DELETE FROM menu_semana WHERE id = $1`, [id]);

    return res.json({ message: '✅ Semana eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar semana:', error);
    return res.status(500).json({ error: 'Error interno al eliminar semana' });
  }
};


