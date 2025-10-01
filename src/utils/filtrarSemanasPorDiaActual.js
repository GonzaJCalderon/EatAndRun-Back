import dayjs from './tiempo.js';

export function filtrarSemanasPorDiaActual(semanas) {
  const hoy = dayjs();

  // Filtrar semanas que todavía no cerraron
  const disponibles = semanas.filter(s => {
    const cierre = s.cierre
      ? dayjs(s.cierre)
      : dayjs(s.semana_inicio).subtract(1, 'day');
    return hoy.isSameOrBefore(cierre.endOf('day'));
  });

  // Mostrar siempre hasta 2 semanas si existen
  return disponibles.slice(0, 2);
}
