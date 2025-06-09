export function getLunesProximaSemana() {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0 = domingo
  const offset = 8 - dia;   // próximo lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offset);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}
