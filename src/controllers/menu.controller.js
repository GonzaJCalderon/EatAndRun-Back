import { pool } from '../db/index.js';
import { getLunesProximaSemana } from '../utils/date.utils.js';
import { getOrCreateSemanaActual, actualizarSemanaCompletaService } from '../utils/getOrCreateSemanaActual.js';
import dayjs, { isoToDateOnly, toDateOnly, mondayOf, fridayOf } from '../utils/tiempo.js';


export const getSemanaActualController = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
      FROM menu_semana
      WHERE CURRENT_DATE BETWEEN semana_inicio AND semana_fin
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(200).json({
        id: null,
        habilitado: false,
        mensaje: 'No hay semana que contenga el día actual',
        semana_inicio: null,
        semana_fin: null,
        cierre: null,
        yaCerro: false,
        dias_habilitados: { lunes:false, martes:false, miercoles:false, jueves:false, viernes:false }
      });
    }

    const s = rows[0];
    const semana_inicio = toDateOnly(s.semana_inicio);
    const semana_fin    = toDateOnly(s.semana_fin);
    const cierre        = s.cierre ? toDateOnly(s.cierre) : null;
    const yaCerro = cierre ? dayjs().isAfter(dayjs(cierre, 'YYYY-MM-DD').endOf('day')) : false;

    res.json({
      id: s.id,
      semana_inicio, semana_fin, cierre,
      habilitado: !!s.habilitado,
      yaCerro,
      dias_habilitados: typeof s.dias_habilitados === 'object' ? s.dias_habilitados : JSON.parse(s.dias_habilitados || '{}')
    });
  } catch (err) {
    console.error('❌ getSemanaActual:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const getSemanaProximaController = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
      FROM menu_semana
      WHERE semana_inicio > CURRENT_DATE
      ORDER BY semana_inicio ASC
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(200).json({ semana: null });
    }

    const s = rows[0];
    res.json({
      semana: {
        id: s.id,
        semana_inicio: toDateOnly(s.semana_inicio),
        semana_fin:    toDateOnly(s.semana_fin),
        cierre:        s.cierre ? toDateOnly(s.cierre) : null,
        habilitado: !!s.habilitado,
        dias_habilitados: typeof s.dias_habilitados === 'object' ? s.dias_habilitados : JSON.parse(s.dias_habilitados || '{}')
      }
    });
  } catch (err) {
    console.error('❌ getSemanaProxima:', err);
    res.status(500).json({ error: 'Error en el servidor' });
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

    const s = result.rows[0];
    // ⬇️⬇️ Normalizá acá ⬇️⬇️
    const semana = {
      ...s,
      semana_inicio: s.semana_inicio ? toDateOnly(s.semana_inicio) : null,
      semana_fin:    s.semana_fin    ? toDateOnly(s.semana_fin)    : null,
      cierre:        s.cierre        ? toDateOnly(s.cierre)        : null,
    };

    res.json({
      message: `Semana ${habilitado ? 'habilitada' : 'bloqueada'} correctamente`,
      semana
    });
  } catch (error) {
    console.error('❌ Error al actualizar estado de la semana:', error);
    res.status(500).json({ error: 'Error interno al actualizar la semana' });
  }
};

export const actualizarCierreSemanaController = async (req, res) => {
  try {
    const { cierre } = req.body;
    if (!cierre) return res.status(400).json({ error: 'La fecha de cierre es requerida' });

    const semanaActual = await pool.query(`
      SELECT * FROM menu_semana
      WHERE CURRENT_DATE BETWEEN semana_inicio AND semana_fin
      ORDER BY semana_inicio DESC
      LIMIT 1
    `);

    if (semanaActual.rows.length === 0) {
      return res.status(404).json({ error: 'No hay semana activa actual' });
    }

    const semanaId = semanaActual.rows[0].id;
const cierreDateOnly = isoToDateOnly(cierre);


    await pool.query(`
      UPDATE menu_semana
      SET cierre = $1::date
      WHERE id = $2
    `, [cierreDateOnly, semanaId]);

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

    // 🧭 Normalizar a "YYYY-MM-DD" (date-only) antes de guardar
   // ✅ después
const fi = isoToDateOnly(fecha_inicio);
const ff = isoToDateOnly(fecha_fin);
const ci = isoToDateOnly(cierre);


    const result = await actualizarSemanaCompletaService(fi, ff, ci); // ← el service debe castear a ::date

    // 🧼 Devolver normalizado
    const row = result.rows[0];
    return res.json({
      message: 'Semana actualizada correctamente',
      semana: {
        ...row,
        semana_inicio: toDateOnly(row.semana_inicio),
        semana_fin:    toDateOnly(row.semana_fin),
        cierre:        row.cierre ? toDateOnly(row.cierre) : null,
      }
    });
  } catch (err) {
    console.error('❌ Error en actualizarSemanaCompletaController:', err);
    res.status(500).json({ error: 'Error al actualizar semana', details: err.message });
  }
};



// ✅ Reemplazo de putSemana SIN forzar lunes/viernes ni cierre=ff
export async function putSemana(req, res) {
  try {
    const { fecha_inicio, fecha_fin, cierre } = req.body;
    if (!fecha_inicio || !fecha_fin || !cierre) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const fi = isoToDateOnly(fecha_inicio); // 'YYYY-MM-DD'
    const ff = isoToDateOnly(fecha_fin);
    const ci = isoToDateOnly(cierre);

    // Validaciones básicas
    if (dayjs(ff).isBefore(dayjs(fi))) {
      return res.status(400).json({ error: 'El fin no puede ser anterior al inicio' });
    }
    if (dayjs(ci).isBefore(dayjs(fi)) || dayjs(ci).isAfter(dayjs(ff))) {
      return res.status(400).json({ error: 'El cierre debe estar entre inicio y fin' });
    }

    // Upsert por semana_inicio exacto (sin forzar)
    const ex = await pool.query('SELECT id FROM menu_semana WHERE semana_inicio = $1::date', [fi]);
    if (ex.rows.length) {
      const { rows } = await pool.query(`
        UPDATE menu_semana
           SET semana_fin = $2::date,
               cierre     = $3::date
         WHERE semana_inicio = $1::date
        RETURNING id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
      `, [fi, ff, ci]);
      const s = rows[0];
      return res.json({
        ok: true,
        semana: {
          ...s,
          semana_inicio: toDateOnly(s.semana_inicio),
          semana_fin:    toDateOnly(s.semana_fin),
          cierre:        s.cierre ? toDateOnly(s.cierre) : null
        }
      });
    }

    const { rows } = await pool.query(`
      INSERT INTO menu_semana (semana_inicio, semana_fin, cierre, habilitado)
      VALUES ($1::date, $2::date, $3::date, false)
      RETURNING id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
    `, [fi, ff, ci]);

    const s = rows[0];
    res.json({
      ok: true,
      semana: {
        ...s,
        semana_inicio: toDateOnly(s.semana_inicio),
        semana_fin:    toDateOnly(s.semana_fin),
        cierre:        s.cierre ? toDateOnly(s.cierre) : null
      }
    });
  } catch (e) {
    console.error('putSemana error:', e);
    res.status(500).json({ error: 'No se pudo guardar la semana' });
  }
}



export const actualizarDiasHabilitadosController = async (req, res) => {
  try {
    const { id, dias_habilitados } = req.body;

    if (!dias_habilitados || typeof dias_habilitados !== 'object') {
      return res.status(400).json({ error: 'Se requiere un objeto con los días habilitados' });
    }

    let semanaId = id;

    if (!semanaId) {
      const semanaActual = await pool.query(`
        SELECT id FROM menu_semana
        WHERE CURRENT_DATE BETWEEN semana_inicio AND semana_fin
        ORDER BY semana_inicio DESC
        LIMIT 1
      `);
      if (semanaActual.rows.length === 0) {
        return res.status(404).json({ error: 'No hay semana activa' });
      }
      semanaId = semanaActual.rows[0].id;
    }

    await pool.query(`
      UPDATE menu_semana
         SET dias_habilitados = $1::jsonb
       WHERE id = $2
    `, [JSON.stringify(dias_habilitados), semanaId]);

    const { rows } = await pool.query(`
      SELECT id, semana_inicio, semana_fin, cierre, habilitado, dias_habilitados
        FROM menu_semana
       WHERE id = $1
    `, [semanaId]);

    res.json({
      message: '✅ Días habilitados actualizados correctamente',
      semana: rows[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar días habilitados:', error);
    res.status(500).json({ error: 'Error interno al actualizar los días habilitados' });
  }
};



export const crearSemanaSiNoExisteController = async (req, res) => {
  try {
    // 🧮 lunes/viernes en AR, usando tus utils
    const hoy = dayjs();               // ya viene con TZ desde ../utils/tiempo.js
    const lunes   = mondayOf(hoy).format('YYYY-MM-DD');   // lunes de esta semana
    const viernes = fridayOf(hoy).format('YYYY-MM-DD');   // viernes de esta semana
    const cierre  = viernes;                               // si querés hora real avisá y lo pasamos a timestamp

    // ¿ya existe esa semana?
    const exists = await pool.query(
      `SELECT * FROM menu_semana WHERE semana_inicio = $1::date`,
      [lunes]
    );
    if (exists.rows.length > 0) {
      const s = exists.rows[0];
      return res.json({
        message: 'Semana ya existe',
        semana: {
          ...s,
          semana_inicio: toDateOnly(s.semana_inicio),
          semana_fin:    toDateOnly(s.semana_fin),
          cierre:        s.cierre ? toDateOnly(s.cierre) : null,
        }
      });
    }

    const dias_habilitados = {
      lunes: true, martes: true, miercoles: true, jueves: true, viernes: true
    };

    const insert = await pool.query(`
      INSERT INTO menu_semana (semana_inicio, semana_fin, habilitado, cierre, dias_habilitados, inicio_toma_pedidos)
      VALUES ($1::date, $2::date, $3, $4::date, $5::jsonb, $6::date)
      RETURNING *
    `, [
      lunes,
      viernes,
      true,
      cierre,
      JSON.stringify(dias_habilitados),
      hoy.format('YYYY-MM-DD')
    ]);

    const row = insert.rows[0];
    return res.status(201).json({
      message: '✅ Semana creada correctamente',
      semana: {
        ...row,
        semana_inicio: toDateOnly(row.semana_inicio),
        semana_fin:    toDateOnly(row.semana_fin),
        cierre:        row.cierre ? toDateOnly(row.cierre) : null,
      }
    });
  } catch (error) {
    console.error('❌ Error al crear semana:', error);
    res.status(500).json({ error: 'Error interno al crear semana' });
  }
};


export const getSemanasHabilitadasController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, semana_inicio, semana_fin, habilitado, dias_habilitados, cierre
      FROM menu_semana
      WHERE habilitado = true
        AND cierre >= CURRENT_DATE
      ORDER BY semana_inicio ASC
    `);

    const semanas = result.rows.map(s => ({
      ...s,
      semana_inicio: toDateOnly(s.semana_inicio),
      semana_fin:    toDateOnly(s.semana_fin),
      cierre:        s.cierre ? toDateOnly(s.cierre) : null,
    }));

    res.json({ semanas });
  } catch (err) {
    console.error('❌ Error al obtener semanas activas:', err);
    res.status(500).json({ error: 'Error al obtener semanas activas' });
  }
};



export const getSemanasDisponiblesParaPedidosController = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, semana_inicio, semana_fin, inicio_toma_pedidos, habilitado, cierre
      FROM menu_semana
      WHERE inicio_toma_pedidos <= CURRENT_DATE
        AND cierre >= CURRENT_DATE
        AND habilitado = true
      ORDER BY semana_inicio ASC
    `);

    const semanas = result.rows.map(s => ({
      ...s,
      semana_inicio: toDateOnly(s.semana_inicio),
      semana_fin:    toDateOnly(s.semana_fin),
      cierre:        s.cierre ? toDateOnly(s.cierre) : null,
    }));

    return res.json({ semanas });
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

export const crearSemanaPuraController = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, cierre } = req.body;
    if (!fecha_inicio || !fecha_fin || !cierre) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const fi = isoToDateOnly(fecha_inicio);
    const ff = isoToDateOnly(fecha_fin);
    const ci = isoToDateOnly(cierre);

    const existe = await pool.query(
      `SELECT id FROM menu_semana WHERE semana_inicio = $1::date`,
      [fi]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una semana con esa fecha de inicio' });
    }

    const insert = await pool.query(`
      INSERT INTO menu_semana (semana_inicio, semana_fin, cierre, habilitado)
      VALUES ($1::date, $2::date, $3::date, false)
      RETURNING *
    `, [fi, ff, ci]);

    const row = insert.rows[0];

    res.status(201).json({
      message: '✅ Semana creada correctamente',
      semana: {
        ...row,
        semana_inicio: toDateOnly(row.semana_inicio),
        semana_fin:    toDateOnly(row.semana_fin),
        cierre:        row.cierre ? toDateOnly(row.cierre) : null,
      }
    });
  } catch (err) {
    console.error('❌ Error al crear semana:', err);
    res.status(500).json({ error: 'Error interno al crear semana' });
  }
};
