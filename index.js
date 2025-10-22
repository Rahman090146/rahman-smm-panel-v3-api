// Simple Express server for Rahman SMM Panel (Full API-ready)
const express = require('express');
const path = require('path');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const fetch = require('node-fetch');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lowdb setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDb(){
  await db.read();
  db.data = db.data || { users: [], services: [], orders: [] };
  if(!db.data.users.find(u=>u.username==='demo')){
    db.data.users.push({id:'u1', username:'demo', password:'demo', balance:30000});
  }
  if(db.data.services.length===0){
    db.data.services.push({id:1, name:'YouTube Subscribers', rate:15000, min:100, max:100000});
    db.data.services.push({id:2, name:'YouTube Views', rate:8000, min:100, max:200000});
    db.data.services.push({id:3, name:'Instagram Followers', rate:12000, min:100, max:50000});
  }
  await db.write();
}

function computePrice(ratePerThousand, qty){
  return Math.round((ratePerThousand/1000) * qty);
}

app.get('/api/services', async (req,res)=>{
  await db.read();
  res.json(db.data.services);
});

app.post('/api/login', async (req,res)=>{
  const { username, password } = req.body;
  await db.read();
  const user = db.data.users.find(u=>u.username===username && u.password===password);
  if(!user) return res.status(401).json({ error:'Invalid credentials' });
  return res.json({ token: 'demo-'+user.id, user:{ id:user.id, username:user.username, balance:user.balance } });
});

app.get('/api/user', async (req,res)=>{
  const token = req.headers.authorization?.replace('Bearer ','')||'';
  if(!token.startsWith('demo-')) return res.status(401).json({error:'No token'});
  const uid = token.split('demo-')[1];
  await db.read();
  const user = db.data.users.find(u=>u.id===uid);
  if(!user) return res.status(404).json({error:'User not found'});
  return res.json({ id:user.id, username:user.username, balance:user.balance });
});

app.post('/api/topup', async (req,res)=>{
  const t = req.headers.authorization?.replace('Bearer ','')||'';
  if(!t.startsWith('demo-')) return res.status(401).json({error:'No token'});
  const uid = t.split('demo-')[1];
  await db.read();
  const user = db.data.users.find(u=>u.id===uid);
  if(!user) return res.status(404).json({error:'User not found'});
  const { amount } = req.body;
  user.balance = (user.balance||0) + Number(amount||0);
  await db.write();
  res.json({ success:true, balance:user.balance });
});

app.post('/api/order', async (req,res)=>{
  const { serviceId, qty, target } = req.body;
  const t = req.headers.authorization?.replace('Bearer ','')||'';
  if(!t.startsWith('demo-')) return res.status(401).json({error:'No token'});
  const uid = t.split('demo-')[1];
  await db.read();
  const user = db.data.users.find(u=>u.id===uid);
  if(!user) return res.status(404).json({error:'User not found'});

  const service = db.data.services.find(s=>s.id==serviceId);
  if(!service) return res.status(400).json({error:'Service not found'});
  const price = computePrice(service.rate, Number(qty));
  if(user.balance < price) return res.status(400).json({error:'Insufficient balance'});

  user.balance -= price;

  const order = {
    id: nanoid(10),
    userId: user.id,
    serviceId: service.id,
    qty: Number(qty),
    target: target || '',
    price,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.data.orders.push(order);
  await db.write();

  const SMM_API_URL = process.env.SMM_API_URL || '';
  const SMM_API_KEY = process.env.SMM_API_KEY || '';
  if(SMM_API_URL && SMM_API_KEY){
    try{
      const resp = await fetch(SMM_API_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer '+SMM_API_KEY },
        body: JSON.stringify({ service: service.id, link: target, quantity: qty })
      });
      const body = await resp.json();
      order.external = body;
      order.status = body.success ? 'processing' : 'error';
      await db.write();
      return res.json({ success:true, order });
    }catch(e){
      order.status = 'error';
      order.externalError = String(e.message);
      await db.write();
      return res.status(500).json({ error:'Failed to call SMM API', detail:String(e.message), order });
    }
  }else{
    setTimeout(async ()=>{ await db.read(); const o = db.data.orders.find(x=>x.id===order.id); if(o){ o.status = 'processing'; await db.write(); } }, 2000);
    return res.json({ success:true, order, simulated:true });
  }
});

app.get('/api/orders', async (req,res)=>{
  const t = req.headers.authorization?.replace('Bearer ','')||'';
  if(!t.startsWith('demo-')) return res.status(401).json({error:'No token'});
  const uid = t.split('demo-')[1];
  await db.read();
  const orders = db.data.orders.filter(o=>o.userId===uid);
  res.json(orders);
});

const PORT = process.env.PORT || 3000;
initDb().then(()=>{ app.listen(PORT, ()=>{ console.log('Rahman SMM Panel API running on port', PORT); }); }).catch(err=>{ console.error('DB init failed', err); });
