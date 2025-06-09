import { Pool } from 'pg';
import { config } from '../../config/env.js';

export const pool = new Pool(config.db);

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ DB connection error:', err));
