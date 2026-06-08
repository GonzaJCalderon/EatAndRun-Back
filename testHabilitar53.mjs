fetch('https://eatandrun-back-production.up.railway.app/api/semana/habilitar', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 53, habilitado: true })
}).then(res => res.json()).then(console.log).catch(console.error);
