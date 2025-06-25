import { Pool } from 'pg';
import { config } from '../../config/env.js';

let pool;

if (config.db.connectionString) {
  pool = new Pool({
    connectionString: config.db.connectionString,
    ssl: config.db.ssl
  });
} else {
  pool = new Pool(config.db);
}

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ DB connection error:', err));

export { pool };
