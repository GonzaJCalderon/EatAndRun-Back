fetch('https://eatandrun-back-production.up.railway.app/api/daily/all')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(console.error);
