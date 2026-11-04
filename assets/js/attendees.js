(() => {
  'use strict';
  renderNav('attendees.html');
  const status=document.getElementById('att-status'),content=document.getElementById('att-content'),auth=document.getElementById('att-auth'),refresh=document.getElementById('att-refresh');
  const search=document.getElementById('att-search'),filter=document.getElementById('att-filter'),teamFilter=document.getElementById('att-team-filter');
  const sessionKey='wedding.attendees.session';
  let adminToken=sessionStorage.getItem(sessionKey)||'';
  const names={attending:'Attending',not_attending:'Unable to attend',undecided:'Will confirm soon',pending:'Awaiting response',not_invited:'Not invited'};
  const noteDrafts=new Map();
  let guests=[],households=[],loading=false,queuedLoad=false,lastToken='',dataVersion=0;
  const state=(g,day)=>!g.days.includes(day)?'not_invited':g.response?.attendance?.[day]||'pending';
  const node=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
  function filtered(){
    const query=search.value.trim().toLowerCase();
    return guests.filter(g=>{
      if(query&&!`${g.name} ${g.household} ${g.invitedBy||''}`.toLowerCase().includes(query))return false;
      if(teamFilter.value!=='all'&&(g.side||'unassigned')!==teamFilter.value)return false;
      const values=g.days.map(d=>state(g,d));
      return filter.value==='all'||filter.value==='pending'&&values.includes('pending')||filter.value==='attending'&&values.includes('attending')||filter.value==='undecided'&&values.includes('undecided')||filter.value==='declined'&&values.length&&values.every(s=>s==='not_attending');
    });
  }
  function accommodationEditor(guest){
    const wrap=document.createElement('div'),input=document.createElement('textarea'),save=node('button','Save note','btn att-note-save'),reload=node('button','Reload note','btn att-note-save'),message=node('small','','att-note-status');
    const draft=noteDrafts.get(guest.id);input.className='att-note';input.rows=2;input.maxLength=500;input.placeholder='Add a note…';input.value=draft?.value??guest.accommodation??'';input.setAttribute('aria-label',`Extra accommodation needed for ${guest.name}`);
    message.setAttribute('role','status');message.setAttribute('aria-live','polite');save.type='button';save.disabled=!draft||draft.saving;reload.type='button';reload.hidden=!draft?.conflict;reload.addEventListener('click',()=>{noteDrafts.delete(guest.id);load();});if(draft?.conflict)message.textContent='Reload this note to use the latest Sheet version.';
    input.addEventListener('input',()=>{const previous=noteDrafts.get(guest.id);noteDrafts.set(guest.id,{value:input.value,version:previous?.version||guest.accommodationVersion});save.disabled=false;message.textContent='Unsaved';});
    save.addEventListener('click',async()=>{
      const current=noteDrafts.get(guest.id);if(!current||current.saving)return;current.saving=true;input.disabled=true;save.disabled=true;message.textContent='Saving…';
      try{
        const result=await RsvpApi.call('saveAccommodation',{adminToken,guestId:guest.id,accommodation:current.value,accommodationVersion:current.version});
        dataVersion++;const live=guests.find(g=>g.id===guest.id);if(live)Object.assign(live,result);noteDrafts.delete(guest.id);input.value=result.accommodation;message.textContent='Saved to Sheet';
      }catch(error){current.saving=false;current.conflict=/note changed/i.test(error.message);reload.hidden=!current.conflict;message.textContent=error.message;save.disabled=false;}
      finally{input.disabled=false;}
    });
    wrap.append(input,save,reload,message);return wrap;
  }
  function render(){
    const stats=document.getElementById('att-stats');stats.replaceChildren();
    [['Total guests',guests.length],['Total Team Bride',guests.filter(g=>g.side==='Team Vidhi').length],['Total Team Groom',guests.filter(g=>g.side==='Team Vivek').length],['Total Team Both',guests.filter(g=>g.side==='Team Both').length],['Attending Day One',guests.filter(g=>state(g,'day1')==='attending').length],['Attending Day Two',guests.filter(g=>state(g,'day2')==='attending').length]].forEach(([label,value])=>{const card=document.createElement('div');card.className='stat';card.append(node('div',label,'k'),node('div',value,'v'));stats.append(card);});
    const rows=document.getElementById('att-rows');rows.replaceChildren();const visible=filtered();
    document.getElementById('att-count').textContent=`Showing ${visible.length} of ${guests.length} guests`;
    visible.forEach(g=>{const tr=document.createElement('tr');const guestCell=node('td',g.name);if(g.isCompanion)guestCell.append(node('small',`+1 of ${g.invitedBy}`,'att-companion'));tr.append(guestCell,node('td',g.side||'Not assigned'));['day1','day2'].forEach(day=>{const td=document.createElement('td'),s=state(g,day);td.append(node('span',names[s],`att-badge ${s}`));tr.append(td);});const manage=document.createElement('td');manage.className='att-manage';const rsvp=node('button','Edit RSVP','btn att-edit');rsvp.type='button';rsvp.setAttribute('aria-label',`Edit RSVP for ${g.name}`);rsvp.addEventListener('click',()=>openRsvp(g));manage.append(rsvp);if(!g.isCompanion){const edit=node('button','Edit guest','btn att-edit');edit.type='button';edit.setAttribute('aria-label',`Edit ${g.name}`);edit.addEventListener('click',()=>openInvitee(g));manage.append(edit);}tr.append(manage);const needs=document.createElement('td');needs.className='att-accommodation-cell';needs.append(accommodationEditor(g));tr.append(needs);rows.append(tr);});
    if(!visible.length){const tr=document.createElement('tr'),td=node('td','No guests match this search.','att-empty');td.colSpan=6;tr.append(td);rows.append(tr);}
  }
  async function load(){
    if(document.activeElement?.matches('.att-note')||[...noteDrafts.values()].some(d=>d.saving))return;
    if(loading){queuedLoad=true;return;}loading=true;const version=dataVersion;refresh.disabled=true;
    try{
      const accessToken=adminToken;
      if(accessToken!==lastToken){guests=[];content.hidden=true;document.getElementById('att-rows').replaceChildren();lastToken=accessToken;}
      document.getElementById('att-signout').hidden=!accessToken;document.getElementById('att-add').hidden=true;
      if(!accessToken){auth.hidden=false;content.hidden=true;guests=[];document.getElementById('att-rows').replaceChildren();document.getElementById('att-sheet').hidden=true;status.textContent='';document.getElementById('att-source').textContent='Private guest list';return;}
      const data=await RsvpApi.call('attendees',{adminToken:accessToken});
      if(version!==dataVersion)return;
      guests=data.guests;households=data.households||[];document.getElementById('att-add').hidden=false;auth.hidden=true;content.hidden=false;status.textContent='';
      document.getElementById('att-source').textContent=data.source;
      const sheet=document.getElementById('att-sheet');sheet.href=data.sheetUrl;sheet.hidden=false;if(!document.activeElement?.matches('.att-note')&&![...noteDrafts.values()].some(d=>d.saving))render();
    }catch(error){status.textContent=error.message+' Use Refresh to try again.';if(/sign in/i.test(error.message)){adminToken='';sessionStorage.removeItem(sessionKey);guests=[];content.hidden=true;auth.hidden=false;document.getElementById('att-rows').replaceChildren();document.getElementById('att-sheet').hidden=true;document.getElementById('att-signout').hidden=true;}}
    finally{loading=false;refresh.disabled=false;if(queuedLoad){queuedLoad=false;load();}}
  }
  const inviteeDialog=document.getElementById('att-invitee'),inviteeForm=document.getElementById('att-invitee-form'),inviteeStatus=document.getElementById('att-invitee-status'),householdSelect=document.getElementById('att-guest-household');
  let editingGuest=null,requestId='',savingInvitee=false;
  function updateHouseholdField(){document.getElementById('att-household-name-wrap').hidden=!!householdSelect.value;document.getElementById('att-guest-household-name').disabled=!!householdSelect.value;}
  function openInvitee(guest=null){
    editingGuest=guest;requestId=crypto.randomUUID();inviteeForm.reset();inviteeStatus.textContent='';
    document.getElementById('att-invitee-title').textContent=guest?'Edit invitee':'Add invitee';document.getElementById('att-invitee-save').textContent=guest?'Save changes':'Add invitee';
    householdSelect.replaceChildren(new Option('Create a new household',''));households.slice().sort((a,b)=>a.label.localeCompare(b.label)).forEach(h=>householdSelect.add(new Option(h.label,h.id)));
    if(guest){document.getElementById('att-guest-name').value=guest.name;document.getElementById('att-guest-side').value=guest.side||'';householdSelect.value=guest.householdId;document.getElementById('att-guest-accommodation').value=guest.accommodation||'';}
    updateHouseholdField();inviteeDialog.showModal();document.getElementById('att-guest-name').focus();
  }
  document.getElementById('att-add').addEventListener('click',()=>openInvitee());
  householdSelect.addEventListener('change',updateHouseholdField);
  document.getElementById('att-invitee-close').addEventListener('click',()=>{if(!savingInvitee)inviteeDialog.close();});
  inviteeDialog.addEventListener('cancel',event=>{if(savingInvitee)event.preventDefault();});
  inviteeForm.addEventListener('submit',async event=>{
    event.preventDefault();if(savingInvitee||!inviteeForm.reportValidity())return;
    savingInvitee=true;const button=document.getElementById('att-invitee-save'),cancel=document.getElementById('att-invitee-close');button.disabled=true;cancel.disabled=true;inviteeStatus.textContent='Saving to the guest list…';
    try{
      const values=Object.fromEntries(new FormData(inviteeForm));const result=await RsvpApi.call('saveInvitee',{...values,adminToken,requestId,...(editingGuest?{guestId:editingGuest.id,editVersion:editingGuest.editVersion}:{})});
      dataVersion++;inviteeDialog.close();status.textContent=`${result.name} saved. Refreshing the list…`;await load();
    }catch(error){inviteeStatus.textContent=error.message;}
    finally{savingInvitee=false;button.disabled=false;cancel.disabled=false;}
  });
  const rsvpDialog=document.getElementById('att-rsvp'),rsvpStatus=document.getElementById('att-rsvp-status');let rsvpGuest=null,savingRsvp=false;
  function openRsvp(guest){
    rsvpGuest=guest;rsvpStatus.textContent='';document.getElementById('att-rsvp-guest').textContent=guest.name;
    ['day1','day2'].forEach(day=>document.getElementById('att-rsvp-'+day).value=guest.response?.attendance?.[day]||'pending');rsvpDialog.showModal();
  }
  document.getElementById('att-rsvp-close').addEventListener('click',()=>{if(!savingRsvp)rsvpDialog.close();});
  rsvpDialog.addEventListener('cancel',event=>{if(savingRsvp)event.preventDefault();});
  document.getElementById('att-rsvp-form').addEventListener('submit',async event=>{
    event.preventDefault();if(savingRsvp||!event.target.reportValidity())return;
    const save=document.getElementById('att-rsvp-save'),cancel=document.getElementById('att-rsvp-close');savingRsvp=true;save.disabled=true;cancel.disabled=true;rsvpStatus.textContent='Saving RSVP…';
    try{await RsvpApi.call('saveHostRsvp',{adminToken,guestId:rsvpGuest.id,rsvpVersion:rsvpGuest.rsvpVersion,attendance:Object.fromEntries(new FormData(event.target))});dataVersion++;rsvpDialog.close();status.textContent=`RSVP saved for ${rsvpGuest.name}. Refreshing the list…`;await load();}
    catch(error){rsvpStatus.textContent=error.message;}
    finally{savingRsvp=false;save.disabled=false;cancel.disabled=false;}
  });
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
  refresh.addEventListener('click',load);search.addEventListener('input',render);filter.addEventListener('change',render);teamFilter.addEventListener('change',render);
  document.getElementById('att-export').addEventListener('click',()=>{
    const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    const rows=[['Guest','Invited by','Team','Day One','Day Two','Extra Accommodation Needed'],...filtered().map(g=>[g.name,g.invitedBy||'',g.side||'Not assigned',names[state(g,'day1')],names[state(g,'day2')],g.accommodation||''])];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wedding-attendees.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  load();
  addEventListener('focus',load);setInterval(()=>{if(!document.hidden)load();},15000);
})();
