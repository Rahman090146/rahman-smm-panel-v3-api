let token = '';
async function api(path, opts={}) {
  const headers = opts.headers || {};
  if(token) headers['Authorization'] = 'Bearer '+token;
  headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {...opts, headers});
  return res.json();
}

async function loadServices(){
  const s = await api('/api/services');
  const sel = document.getElementById('serviceSelect');
  sel.innerHTML = s.map(x=>`<option value="${x.id}" data-rate="${x.rate}">${x.name} - Rp${x.rate}/1000</option>`).join('');
  updatePrice();
}

function formatRp(n){ return 'Rp'+Number(n).toLocaleString(); }

function updatePrice(){
  const sel = document.getElementById('serviceSelect');
  const qty = Number(document.getElementById('qty').value||0);
  const rate = Number(sel.options[sel.selectedIndex].dataset.rate||0);
  document.getElementById('priceInfo').value = formatRp(rate) + ' / 1000';
  document.getElementById('totalInfo').value = formatRp(Math.round((rate/1000)*qty));
}

document.getElementById('qty').addEventListener('input', updatePrice);
document.getElementById('serviceSelect').addEventListener('change', updatePrice);

document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const username = document.getElementById('username').value||'demo';
  const password = document.getElementById('password').value||'demo';
  const r = await api('/api/login',{ method:'POST', body: JSON.stringify({ username, password }) });
  if(r.error) return alert(r.error);
  token = r.token;
  document.getElementById('authCard').style.display='none';
  document.getElementById('panel').style.display='block';
  document.getElementById('ordersCard').style.display='block';
  document.getElementById('userName').innerText = r.user.username;
  document.getElementById('balanceTag').innerText = formatRp(r.user.balance);
  await loadServices();
  loadOrders();
});

document.getElementById('btnTopup').addEventListener('click', async ()=>{
  const amount = 10000;
  const r = await api('/api/topup',{ method:'POST', body: JSON.stringify({ amount }) });
  if(r.error) return alert(r.error);
  document.getElementById('balanceTag').innerText = formatRp(r.balance);
});

document.getElementById('btnOrder').addEventListener('click', async ()=>{
  const serviceId = document.getElementById('serviceSelect').value;
  const qty = Number(document.getElementById('qty').value);
  const target = document.getElementById('target').value;
  const r = await api('/api/order',{ method:'POST', body: JSON.stringify({ serviceId, qty, target }) });
  if(r.error) return alert(r.error || 'Order failed');
  alert('Order placed: '+r.order.id);
  document.getElementById('balanceTag').innerText = formatRp((await api('/api/user', { method:'GET' })).balance);
  loadOrders();
});

async function loadOrders(){
  const list = await api('/api/orders');
  const container = document.getElementById('ordersList');
  container.innerHTML = list.map(o=>`<div style="padding:8px;border-bottom:1px solid #eee"><b>${o.id}</b><br>${o.qty} - ${o.status} - Rp${o.price}</div>`).join('');
}
