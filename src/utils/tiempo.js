// src/utils/tiempo.js (BACKEND)

import dayjs from 'dayjs';
import 'dayjs/locale/es.js'; // 👈 esta línea es la clave

dayjs.locale('es');

const HORA_CORTE = 6;

export const getFechaOperativa = () => {
  const ahora = dayjs();
  return ahora.hour() < HORA_CORTE ? ahora.subtract(1, 'day') : ahora;
};

export const getDiaOperativoNombre = () => {
  return getFechaOperativa().format('dddd');
};

export const esHoyOperativo = (fecha) => {
  return dayjs(fecha).isSame(getFechaOperativa(), 'day');
};

export default dayjs;
