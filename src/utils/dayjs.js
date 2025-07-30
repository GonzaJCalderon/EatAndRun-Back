import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import 'dayjs/locale/es.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

export default dayjs;
