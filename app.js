"use strict";

const uid = (prefix="id") => `${prefix}_${Math.random().toString(36).slice(2,9)}`;
const $ = id => document.getElementById(id);
const lsGet = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch(e){ return fallback; }
}
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

if(!localStorage.getItem('pn_balance')) localStorage.setItem('pn_balance', JSON.stringify(2500));
if(!localStorage.getItem('pn_transactions')) localStorage.setItem('pn_transactions', JSON.stringify([
  {id:uid('tx'), type:'received', amount:2000, user:'Topup', category:'topup', note:'Initial topup', date:new Date().toISOString()},
  {id:uid('tx'), type:'sent', amount:150, user:'Anil', category:'food', note:'Lunch', date:new Date(Date.now()-86400000*2).toISOString()}
]));
if(!localStorage.getItem('pn_tickets')) localStorage.setItem('pn_tickets', JSON.stringify([]));
if(!localStorage.getItem('pn_settings')) lsSet('pn_settings',{theme:'dark', notif:true});

function getBalance(){ return parseFloat(localStorage.getItem('pn_balance')||0); }
function setBalance(v){ localStorage.setItem('pn_balance', JSON.stringify(v)); }
function getTx(){ return lsGet('pn_transactions', []); }
function saveTx(arr){ lsSet('pn_transactions', arr); }
function getTickets(){ return lsGet('pn_tickets', []); }
function saveTickets(t){ lsSet('pn_tickets', t); }

function money(n){ return "₹" + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}); }
function animateNumber(el, from, to, ms=800){
  if(!el) return;
  const start = performance.now();
  const r = () => {
    const now = performance.now();
    const p = Math.min(1, (now - start) / ms);
    const val = from + (to - from) * p;
    el.textContent = money(val);
    if(p < 1) requestAnimationFrame(r);
  }
  r();
}

document.addEventListener('DOMContentLoaded', () => {
 
  const miniBal = $('mini-balance');
  const miniCnt = $('mini-count');
  if(miniBal) {
    miniBal.textContent = money(getBalance());
    miniCnt.textContent = getTx().length;
  }

  if($('balance-amount')) renderDashboard();

  if($('addForm')) {

    window.toggleMethodFields = function(){
      const m = $('addMethod').value;
      ['upiRow','cardRow','netRow'].forEach(id => $(id).classList.add('hidden'));
      if(m==='upi') $('upiRow').classList.remove('hidden');
      if(m==='card') $('cardRow').classList.remove('hidden');
      if(m==='netbank') $('netRow').classList.remove('hidden');
    }
    toggleMethodFields();
    window.submitAdd = function(e){
      e.preventDefault();
      const amt = Math.round(Number($('addAmount').value) * 100) / 100;
      if(!amt || amt <= 0) { $('addMsg').textContent = "Enter a valid amount"; return; }
      
      const method = $('addMethod').value;

      const tx = getTx();
      const t = { id: uid('tx'), type:'topup', amount: amt, user: 'You', category:'topup', note:`Added via ${method}`, date: new Date().toISOString() };
      tx.unshift(t); saveTx(tx);
      setBalance(getBalance()+amt);
      $('addMsg').textContent = `Success! ${money(amt)} added.`;
      setTimeout(()=> location.href='dashboard.html', 900);
    }
  }

  if($('sendForm')) {
    
    const contacts = Array.from(new Set(getTx().map(t=>t.user))).filter(Boolean);
    const datalist = $('contacts');
    datalist.innerHTML = contacts.map(c => `<option value="${c}">`).join('');
    
    const feePreview = $('feePreview');
    const updateFee = () => {
      const amt = Number($('sendAmount').value || 0);
      const f = Math.max(0, Math.round(amt * 0.02 * 100)/100);
      feePreview.textContent = money(f);
    }
    $('sendAmount').addEventListener('input', updateFee);
    window.submitSend = function(e){
      e.preventDefault();
      const recipient = $('recipient').value.trim();
      const amount = Math.round(Number($('sendAmount').value) * 100) / 100;
      const category = $('category').value;
      const note = $('note').value;
      if(!recipient || !amount || amount <= 0){ $('sendMsg').textContent = "Enter valid recipient & amount"; return; }
      if(amount > getBalance()){ $('sendMsg').textContent = "Insufficient balance"; return; }
      
      const tx = getTx();
      const t = { id: uid('tx'), type:'sent', amount, user: recipient, category, note, date: new Date().toISOString() };
      tx.unshift(t); saveTx(tx);
      setBalance(getBalance()-amount);
      $('sendMsg').textContent = `Sent ${money(amount)} to ${recipient}`;
      setTimeout(()=> location.href='dashboard.html', 900);
    }
  }

  if($('txList')) {
    window.applyFilter = function(){
      const q = $('searchTx').value.toLowerCase();
      const f = $('txFilter').value;
      let arr = getTx();
      if(f !== 'all') arr = arr.filter(t => t.type === f);
      if(q) arr = arr.filter(t => (t.user||'').toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q));
      renderTxList(arr);
    }
    window.openTx = function(id){
      const t = getTx().find(x=>x.id===id);
      if(!t) return;
      $('txModalTitle').textContent = `${t.type.toUpperCase()} — ${money(t.amount)}`;
      $('txModalBody').innerHTML = `
        <p><strong>To/From:</strong> ${t.user}</p>
        <p><strong>Category:</strong> ${t.category}</p>
        <p><strong>Note:</strong> ${t.note||'-'}</p>
        <p><strong>Date:</strong> ${new Date(t.date).toLocaleString()}</p>
        <p><strong>ID:</strong> ${t.id}</p>
      `;
      $('txModal').classList.remove('hidden');
    }
    window.closeModal = function(){ $('txModal').classList.add('hidden'); }
    applyFilter();
  }

  if($('supportForm')) {
    window.submitSupport = function(e){
      e.preventDefault();
      const name = $('supName').value.trim();
      const email = $('supEmail').value.trim();
      const msg = $('supMsg').value.trim();
      if(!name || !email || !msg){ $('supMsgInfo').textContent = 'Please fill all fields'; return; }
      const tickets = getTickets();
      const ticket = { id: uid('TKT'), name, email, msg, status:'open', date:new Date().toISOString() };
      tickets.unshift(ticket);
      saveTickets(tickets);
      $('supMsgInfo').textContent = `Ticket created • ID: ${ticket.id}`;
      $('supportForm').reset();
      renderTickets();
    }
    window.renderTickets = function(){
      const node = $('ticketList');
      const tickets = getTickets();
      node.innerHTML = tickets.length ? tickets.map(t=>`
        <div class="tx-row">
          <div>
            <div><strong>${t.id}</strong> • ${t.name}</div>
            <div class="tx-meta"><small>${t.msg}</small></div>
            <div class="tx-meta"><small>${new Date(t.date).toLocaleString()} • ${t.status}</small></div>
          </div>
        </div>
      `).join('') : `<div class="muted">No tickets yet.</div>`;
    }
    renderTickets();
  }

}); 
function renderDashboard(){
  const balEl = $('balance-amount');
  const statIncome = $('stat-income');
  const statSpend = $('stat-spend');
  const statCount = $('stat-count');
  if(!balEl) return;
  const tx = getTx();
  const income = tx.filter(t => t.type === 'received' || t.type==='topup').reduce((s,x)=>s+x.amount,0);
  const spend = tx.filter(t => t.type === 'sent').reduce((s,x)=>s+x.amount,0);
  animateNumber(balEl, 0, getBalance(), 900);
  if(statIncome) statIncome.textContent = money(income);
  if(statSpend) statSpend.textContent = money(spend);
  if(statCount) statCount.textContent = tx.length;
  renderTxList(tx.slice(0,50));
}
function renderTxList(list){
  const container = $('txList');
  if(!container) return;
  container.innerHTML = list.map(t => `
    <div class="tx-row" onclick="openTx('${t.id}')">
      <div class="tx-left">
        <div class="tx-type ${t.type==='sent'?'sent':'received'}"></div>
        <div>
          <div><strong>${t.user}</strong> <small class="muted">• ${t.category}</small></div>
          <div class="tx-meta"><small>${t.note||''}</small></div>
        </div>
      </div>
      <div>
        <div><strong>${money(t.amount)}</strong></div>
        <div class="tx-meta"><small>${new Date(t.date).toLocaleDateString()}</small></div>
      </div>
    </div>
  `).join('');
}
{
  const topNode = $('topTx');
  const top = tx.slice().sort((a,b)=>b.amount - a.amount).slice(0,6);
  topNode.innerHTML = top.map(t=>`<div class="tx-row"><div><strong>${t.user}</strong> • ${t.category}</div><div>${money(t.amount)}</div></div>`).join('');
}
function copyBalance(){ navigator.clipboard?.writeText(String(getBalance())).then(()=> alert('Balance copied')) }
function exportCSV(){
  const tx = getTx();
  const csv = ['id,type,amount,user,category,note,date', ...tx.map(t => `${t.id},${t.type},${t.amount},"${t.user}",${t.category},"${(t.note||'').replace(/"/g,'""')}",${t.date}`)].join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = 'paynova_transactions.csv'; a.click(); URL.revokeObjectURL(url);
}
function clearAll(){ if(confirm('Clear all app data?')){ localStorage.clear(); location.reload(); } }
function toggleTheme(){
  const s = lsGet('pn_settings', {}); s.theme = s.theme === 'dark' ? 'light' : 'dark'; lsSet('pn_settings', s);
  document.body.classList.toggle('light-theme', s.theme==='light');
}
function toggleNotif(v){ const s = lsGet('pn_settings', {}); s.notif = !!v; lsSet('pn_settings', s); }

window.renderDashboard = renderDashboard;
window.renderAnalytics = renderAnalytics;
window.applyFilter = window.applyFilter || function(){};
window.submitAdd = window.submitAdd || function(e){ e.preventDefault(); };
window.submitSend = window.submitSend || function(e){ e.preventDefault(); };
window.submitSupport = window.submitSupport || function(e){ e.preventDefault(); };
window.copyBalance = copyBalance;
window.exportCSV = exportCSV;
window.clearAll = clearAll;
window.toggleTheme = toggleTheme;
window.toggleNotif = toggleNotif;
window.openTx = window.openTx || function(){};
window.closeModal = window.closeModal || function(){};
