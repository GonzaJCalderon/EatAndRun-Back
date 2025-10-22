import minMax from 'dayjs/plugin/minMax.js';
// src/utils/tiempo.js
import dayjs from 'dayjs';
import 'dayjs/locale/es.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import minMax from 'dayjs/plugin/minMax.js';   // ✅ IMPORT CORRECTO

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(minMax);  // ✅ AHORA SÍ FUNCIONA
dayjs.locale('es');

export const TZ = 'America/Argentina/Buenos_Aires';

// ✅ "date-only" en AR
export const toDateOnly = (s) => parseDateOnlyInTZ(s).format('YYYY-MM-DD');

// ✅ ISO con Z → date-only (sin mover el día)
const parseDateOnlyInTZ = (s) => dayjs.utc(s);

export const mondayOf = (s) => parseDateOnlyInTZ(s).startOf('isoWeek');
export const fridayOf = (s) => mondayOf(s).add(4, 'day');

export const isoToDateOnly = (s) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return dayjs.utc(s).format('YYYY-MM-DD');
};

export default dayjs;
