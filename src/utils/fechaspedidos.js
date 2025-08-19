// utils/fechasPedido.js
import dayjs from './tiempo.js'; // o desde la ruta donde tengas tu configuración centralizada


const mapDia = {
  lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5,
};

// intenta leer fechas “lunes 04/08”, “jueves 07/08”, etc. del body del pedido
export function pickFechaDesdePedidoBody(pedido, semanasActivas) {
  if (!pedido) return null;

  // 1) Preferir claves "diarios" / "extras" con fecha "lunes 04/08"
  for (const tipo of ['diarios', 'extras']) {
    const obj = pedido?.[tipo] || {};
    for (const key of Object.keys(obj)) {
      // key puede ser: "lunes", "lunes 04/08"
      const [rawDia, rawFecha] = String(key).split(' ');
      const dia = (rawDia || '').toLowerCase();

      // si tiene "dd/mm", úsalo
      if (rawFecha && /^\d{2}\/\d{2}$/.test(rawFecha)) {
        const [dd, mm] = rawFecha.split('/').map(n => parseInt(n, 10));
        // año: toma el de la semana activa que contenga ese dd/mm
        for (const sem of semanasActivas) {
          const candidate = dayjs(sem.semana_inicio).date(dd).month(mm - 1).startOf('day');
          if (candidate.isBetween(dayjs(sem.semana_inicio).startOf('day'), dayjs(sem.semana_fin).endOf('day'), 'day', '[]')) {
            return candidate.toDate();
          }
        }
      }

      // si solo viene "lunes" (sin dd/mm), mapea al "lunes" de la semana activa “principal” (p.ej. la primera)
      if (mapDia[dia]) {
        const sem = semanasActivas[0];
        if (sem) {
          const dow = mapDia[dia]; // 1..5
          const base = dayjs(sem.semana_inicio).startOf('day');
          const candidate = base.add(dow - 1, 'day').toDate();
          return candidate;
        }
      }
    }
  }

  // 2) tarta sin día: usa el inicio de la primera semana activa
  if (pedido?.tartas && Object.keys(pedido.tartas).length > 0) {
    if (semanasActivas[0]) return dayjs(semanasActivas[0].semana_inicio).startOf('day').toDate();
  }

  return null;
}

export function clampToSemanasActivas(fecha, semanasActivas) {
  if (!fecha || !semanasActivas?.length) return null;
  const d = dayjs(fecha).startOf('day');
  for (const sem of semanasActivas) {
    const ini = dayjs(sem.semana_inicio).startOf('day');
    const fin = dayjs(sem.semana_fin).endOf('day');
    if (d.isBetween(ini, fin, 'day', '[]')) return d.toDate();
  }
  // si no cae en ninguna, “snap” a inicio de la primera semana activa
  return dayjs(semanasActivas[0].semana_inicio).startOf('day').toDate();
}
