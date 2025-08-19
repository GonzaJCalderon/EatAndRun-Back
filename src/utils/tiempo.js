// src/utils/tiempo.js
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import isBetween from 'dayjs/plugin/isBetween.js'; // ✅


dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(isBetween); 
dayjs.locale('es');

export const TZ = 'America/Argentina/Buenos_Aires';


// ✅ "date-only" en AR
export const toDateOnly = (s) => parseDateOnlyInTZ(s).format('YYYY-MM-DD');

// ✅ ISO con Z → date-only (sin mover el día)
// ⚠️ ANTES usabas: dayjs(s).tz(TZ) -> convierte y puede retroceder un día
const parseDateOnlyInTZ = (s) => dayjs.tz(s, TZ); // ✅ interpreta en AR sin conversión

export const mondayOf  = (s) => parseDateOnlyInTZ(s).startOf('isoWeek');
export const fridayOf  = (s) => mondayOf(s).add(4, 'day');

export const isoToDateOnly = (s) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;   // ya es date-only
  return dayjs.utc(s).format('YYYY-MM-DD');
};


// (opcional)
export default dayjs;
