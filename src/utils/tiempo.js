// src/utils/tiempo.js (BACKEND) — versión unificada y robusta
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';

import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import isoWeek from 'dayjs/plugin/isoWeek.js'; // startOf('isoWeek') => lunes

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isoWeek);

// Locale español + semana inicia lunes (por si algún plugin mira el locale)
dayjs.locale({
  name: 'es',
  // weekStart solo lo respetan algunos métodos; igual usamos isoWeek para garantizar lunes
  weekStart: 1,
});

export const TZ = 'America/Argentina/Buenos_Aires';

// =====================
// Helpers de fecha base
// =====================

// "Día operativo": si es antes de HORA_CORTE, usamos el día anterior
const HORA_CORTE = 6;

export const getFechaOperativa = () => {
  const ahora = dayjs().tz(TZ);
  return ahora.hour() < HORA_CORTE ? ahora.subtract(1, 'day') : ahora;
};

export const getDiaOperativoNombre = () => {
  return getFechaOperativa().format('dddd'); // en español
};

export const esHoyOperativo = (fecha) => {
  return dayjs(fecha).tz(TZ).isSame(getFechaOperativa(), 'day');
};

// =====================
// Normalizadores "date-only"
// =====================

// Cualquier cosa -> "YYYY-MM-DD" leyéndolo en TZ local (AR)
export const toDateOnly = (s) => dayjs(s).tz(TZ).format('YYYY-MM-DD');

// ISO con Z (u otra zona) -> "YYYY-MM-DD" leyendo en UTC para NO correr día
export const isoToDateOnly = (s) => dayjs.utc(s).format('YYYY-MM-DD');

// =====================
// Semanas (lunes a viernes)
// =====================

// Lunes de la semana de una fecha (siempre lunes, gracias a isoWeek)
export const mondayOf = (s) => dayjs(s).tz(TZ).startOf('isoWeek'); // lunes

// Viernes de esa misma semana
export const fridayOf = (s) => mondayOf(s).add(4, 'day');

// Próximo lunes (siguiente semana; útil para crear próximas semanas)
export const nextMonday = (s = undefined) => {
  const base = dayjs(s ?? undefined).tz(TZ);
  return base.startOf('isoWeek').add(7, 'day'); // lunes siguiente
};

// Export por defecto (configurado con tz/locale/plugins)
export default dayjs;
