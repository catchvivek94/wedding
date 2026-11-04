(() => {
  'use strict';
  renderNav('attendees.html');
  const status=document.getElementById('att-status'),content=document.getElementById('att-content'),auth=document.getElementById('att-auth'),refresh=document.getElementById('att-refresh');
  const search=document.getElementById('att-search'),filter=document.getElementById('att-filter');
  const sessionKey='wedding.attendees.session';
  let adminToken=sessionStorage.getItem(sessionKey)||'';
  const names={attending:'Attending',not_attending:'Unable to attend',undecided:'Will confirm soon',pending:'Awaiting response',not_invited:'Not invited'};
  let guests=[],loading=false,lastToken='';
  const state=(g,day)=>!g.days.includes(day)?'not_invited':g.response?.attendance?.[day]||'pending';
  const node=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
  function filtered(){
    const query=search.value.trim().toLowerCase();
    return guests.filter(g=>{
      if(query&&!`${g.name} ${g.household}`.toLowerCase().includes(query))return false;
      const values=g.days.map(d=>state(g,d));
      return filter.value==='all'||filter.value==='pending'&&values.includes('pending')||filter.value==='attending'&&values.includes('attending')||filter.value==='undecided'&&values.includes('undecided')||filter.value==='declined'&&values.length&&values.every(s=>s==='not_attending');
    });
  }
  function render(){
    const stats=document.getElementById('att-stats');stats.replaceChildren();
    [['Invited guests',guests.length],['Attending Day One',guests.filter(g=>state(g,'day1')==='attending').length],['Attending Day Two',guests.filter(g=>state(g,'day2')==='attending').length],['Awaiting response',guests.filter(g=>g.days.some(d=>state(g,d)==='pending')).length]].forEach(([label,value])=>{const card=document.createElement('div');card.className='stat';card.append(node('div',label,'k'),node('div',value,'v'));stats.append(card);});
    const rows=document.getElementById('att-rows');rows.replaceChildren();const visible=filtered();
    document.getElementById('att-count').textContent=`Showing ${visible.length} of ${guests.length} invited guests`;
    visible.forEach(g=>{const tr=document.createElement('tr');tr.append(node('td',g.name),node('td',g.household));['day1','day2'].forEach(day=>{const td=document.createElement('td'),s=state(g,day);td.append(node('span',names[s],`att-badge ${s}`));tr.append(td);});tr.append(node('td',g.response?.updatedAt?new Date(g.response.updatedAt).toLocaleString():'—'));rows.append(tr);});
    if(!visible.length){const tr=document.createElement('tr'),td=node('td','No guests match this search.','att-empty');td.colSpan=5;tr.append(td);rows.append(tr);}
  }
  async function load(){
    if(loading)return;loading=true;refresh.disabled=true;
    try{
      const accessToken=adminToken;
      if(accessToken!==lastToken){guests=[];content.hidden=true;document.getElementById('att-rows').replaceChildren();lastToken=accessToken;}
      document.getElementById('att-signout').hidden=!accessToken;
      if(!accessToken){auth.hidden=false;content.hidden=true;guests=[];document.getElementById('att-rows').replaceChildren();document.getElementById('att-sheet').hidden=true;status.textContent='';document.getElementById('att-source').textContent='Private guest list';return;}
      const data=await RsvpApi.call('attendees',{adminToken:accessToken});
      guests=data.guests;auth.hidden=true;content.hidden=false;status.textContent='';
      document.getElementById('att-source').textContent=`${data.source} · ${data.householdCount} households`;
      document.getElementById('att-updated').textContent='Updated '+new Date().toLocaleTimeString();
      const sheet=document.getElementById('att-sheet');sheet.href=data.sheetUrl;sheet.hidden=false;render();
    }catch(error){status.textContent=error.message+' Use Refresh to try again.';if(/sign in/i.test(error.message)){adminToken='';sessionStorage.removeItem(sessionKey);guests=[];content.hidden=true;auth.hidden=false;document.getElementById('att-rows').replaceChildren();document.getElementById('att-sheet').hidden=true;document.getElementById('att-signout').hidden=true;}}
    finally{loading=false;refresh.disabled=false;}
  }
  const login=document.getElementById('att-login'),loginStatus=document.getElementById('att-login-status');
  document.getElementById('att-signin').addEventListener('click',()=>{loginStatus.textContent='';login.showModal();});
  document.getElementById('att-login-close').addEventListener('click',()=>login.close());
  document.getElementById('att-signout').addEventListener('click',()=>{adminToken='';sessionStorage.removeItem(sessionKey);load();});
  document.getElementById('att-login-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=document.getElementById('att-login-submit');button.disabled=true;loginStatus.textContent='Signing in…';
    try{const data=new FormData(event.target);const result=await RsvpApi.call('adminLogin',{username:data.get('email'),password:data.get('password')});adminToken=result.adminToken;sessionStorage.setItem(sessionKey,adminToken);event.target.reset();login.close();load();}
    catch(error){loginStatus.textContent=error.message;}
    finally{button.disabled=false;}
  });
  refresh.addEventListener('click',load);search.addEventListener('input',render);filter.addEventListener('change',render);
  document.getElementById('att-export').addEventListener('click',()=>{
    const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    const rows=[['Guest','Household','Day One','Day Two','Updated at'],...filtered().map(g=>[g.name,g.household,names[state(g,'day1')],names[state(g,'day2')],g.response?.updatedAt||''])];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wedding-attendees.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  load();
  addEventListener('focus',load);setInterval(()=>{if(!document.hidden)load();},15000);
})();
