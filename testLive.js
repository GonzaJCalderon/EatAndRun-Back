import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 2, role: 4 }, process.env.JWT_SECRET || 'c7f8e9b2a1d4f6c3e5a8d9b0f1c2e4a6d8b9f0c1e3a5d7b2f4c6e8a0b1d3f5c');
console.log("TOKEN:", token);
fetch('https://eatandrun-back-production.up.railway.app/api/admin/orders', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json()).then(data => {
  const p = data.find(x => x.id === 216);
  console.log(JSON.stringify(p, null, 2));
}).catch(console.error);
