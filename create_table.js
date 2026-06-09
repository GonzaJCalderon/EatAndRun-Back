import('./src/db/index.js').then(({pool}) => 
  pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_daily_status (
      id SERIAL PRIMARY KEY, 
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE, 
      fecha DATE NOT NULL, 
      status VARCHAR(50) DEFAULT 'pendiente', 
      motivo TEXT, 
      created_at TIMESTAMP DEFAULT NOW(), 
      updated_at TIMESTAMP DEFAULT NOW(), 
      UNIQUE(order_id, fecha)
    )
  `).then(() => {
    console.log('Table created!');
    process.exit(0);
  })
).catch(console.error);
