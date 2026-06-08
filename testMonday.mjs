import { pool } from './src/db/index.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);

async function checkMonday() {
  const { rows } = await pool.query('SELECT id, nombre, date FROM daily_menu ORDER BY date DESC LIMIT 10');
  console.log("=== DAILY ===");
  for (const item of rows) {
    const rawDate = item.date;
    const utcFormat = dayjs(item.date).utc().format('YYYY-MM-DD');
    const localFormat = dayjs(item.date).format('YYYY-MM-DD');
    const isoString = new Date(item.date).toISOString();
    console.log(`ID: ${item.id} | Nombre: ${item.nombre} | RAW: ${rawDate} | UTC: ${utcFormat} | LOCAL: ${localFormat} | JS Day (UTC): ${dayjs(utcFormat).day()}`);
  }
  process.exit(0);
}
checkMonday();
