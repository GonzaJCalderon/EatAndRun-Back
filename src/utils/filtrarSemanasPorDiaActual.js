import dayjs from './tiempo.js';

export const filtrarSemanasPorDiaActual = (semanas, max = 2) => {
  const hoy = dayjs();

  const disponibles = semanas.filter(s => {
    const cierre = s.cierre
      ? dayjs(s.cierre)
      : dayjs(s.semana_inicio).subtract(1, 'day');
    return hoy.isSameOrBefore(cierre.endOf('day'));
  });

  return disponibles.slice(0, max);
};
