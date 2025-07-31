import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isBetween from 'dayjs/plugin/isBetween.js'; // 👈 necesario si usás .isBetween
import 'dayjs/locale/es.js'; // 👈 importa el idioma español

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

dayjs.locale('es'); // 👈 esto aplica el idioma globalmente

export default dayjs;
