// utils/dayjs.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

import timezone from 'dayjs/plugin/timezone.js';
import 'dayjs/locale/es.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');


// 👉 Lunes de la semana actual
export const getLunesSemanaActual = () => {
  return dayjs().tz('America/Argentina/Buenos_Aires').startOf('week').add(1, 'day').toDate();
};

// 👉 Lunes de la próxima semana
export const getLunesProximaSemana = () => {
  return dayjs().tz('America/Argentina/Buenos_Aires').startOf('week').add(8, 'day').toDate();
};

// 👉 Rango de semana actual
export const getSemanaActualRange = () => {
  const lunes = dayjs().tz('America/Argentina/Buenos_Aires').startOf('week').add(1, 'day');
  const viernes = lunes.add(4, 'day').endOf('day');
  return {
    lunes: lunes.toDate(),
    viernes: viernes.toDate(),
  };
};

console.log('📅 utils/date.utils.js cargado con:', {
  getLunesProximaSemana: typeof getLunesProximaSemana,
  getLunesSemanaActual: typeof getLunesSemanaActual
});


export default dayjs;
