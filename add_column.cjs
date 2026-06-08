const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:hIXoWIXDqBqFwNqTOLTqAtoZRYrVzVId@roundhouse.proxy.rlwy.net:18174/railway' });

pool.query(`
  ALTER TABLE fixed_menu 
  ADD COLUMN IF NOT EXISTS available_days TEXT[] 
  DEFAULT ARRAY['lunes', 'martes', 'miércoles', 'jueves', 'viernes']
`)
  .then(() => console.log('Column added successfully'))
  .catch(err => console.error('Error:', err))
  .finally(() => pool.end());
