fetch('https://eatandrun-back-production.up.railway.app/api/fixed')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(console.error);
