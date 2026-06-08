fetch('https://eatandrun-back-production.up.railway.app/api/semana/72', {method: 'DELETE'}).then(res => res.json()).then(data => console.log(data)).catch(console.error);
