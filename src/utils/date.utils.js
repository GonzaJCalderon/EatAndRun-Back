export const getLunesSemanaActual = () => {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0 = domingo, 1 = lunes...
  const offset = (dia === 0 ? -6 : 1 - dia); // llevar al lunes actual
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offset);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
};


export const getLunesProximaSemana = () => {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0 = domingo, 1 = lunes...
  const offset = (dia === 0 ? 1 : 8 - dia); // lunes siguiente
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offset);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
};

const getSemanaActualRange = () => {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=domingo, 1=lunes

  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((dia + 6) % 7));
  lunes.setHours(0, 0, 0, 0);

  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4); // de lunes a viernes
  viernes.setHours(23, 59, 59, 999);

  return { lunes, viernes };
};
