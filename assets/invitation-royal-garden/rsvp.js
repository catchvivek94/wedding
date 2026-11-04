/* Name-selected household RSVP. Google credentials stay in the backend. */
(() => {
  'use strict';
  const nameDialog=document.getElementById('guest-name-dialog');
  const rsvpDialog=document.getElementById('rsvp-dialog');
  const input=document.getElementById('guest-name');
  const teamInputs=[...document.querySelectorAll('input[name="guest-team"]')];
  const nameStep=document.getElementById('guest-name-step');
  let selectedTeam='';
  teamInputs.forEach(radio=>radio.addEventListener('change',()=>{
    selectedTeam=radio.value;const firstChoice=nameStep.hidden;nameStep.hidden=false;
    selectButton.disabled=!selected||busy;if(firstChoice)input.focus();
  }));
  const results=document.getElementById('guest-results');
  const searchStatus=document.getElementById('guest-search-status');
  const selectButton=document.getElementById('guest-continue');
  const rsvpButton=document.getElementById('rsvp-button');
  const form=document.getElementById('rsvp-form');
  const saveButton=document.getElementById('rsvp-save');
  const saveStatus=document.getElementById('rsvp-save-status');
  const memberList=document.getElementById('rsvp-members');
  let selected=null,profile=null,token='',timer=0,requestNumber=0,controller=null,busy=false;
  const options=[];
  let active=-1;
  async function api(path,{method='GET',body,signal}={}){
    const [action,query]=path.split('?');
    const payload={...(body||{}),...(token?{token}:{}),...(query?{q:new URLSearchParams(query).get('q')}:{})};
    return RsvpApi.call(action,payload,signal);
  }
  function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
  function clearResults(){results.replaceChildren();options.length=0;active=-1;input.removeAttribute('aria-activedescendant');input.setAttribute('aria-expanded','false');}
  function selectGuest(guest){
    selected=guest;input.value=guest.name;clearResults();
    selectButton.disabled=!selectedTeam;searchStatus.textContent=`Invitation found for ${guest.name}.`;
  }
  function renderResults(matches){
    clearResults();input.setAttribute('aria-expanded',String(matches.length>0));
    matches.forEach((guest,i)=>{
      const li=document.createElement('li');li.setAttribute('role','presentation');
      const button=document.createElement('button');button.type='button';button.className='guest-result';button.id=`guest-result-${i}`;
      button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.tabIndex=-1;
      button.append(text('span',guest.name),text('small',guest.household));
      button.addEventListener('click',()=>selectGuest(guest));
      li.append(button);results.append(li);options.push({guest,button});
    });
  }
  async function search(){
    const query=input.value.trim(),version=++requestNumber;
    controller?.abort();clearResults();
    if(query.length<3){searchStatus.textContent='Type at least 3 letters to find your invitation.';return;}
    controller=new AbortController();searchStatus.textContent='Looking for your invitation…';
    try{
      const data=await api(`search?q=${encodeURIComponent(query)}`,{signal:controller.signal});
      if(version!==requestNumber||!nameDialog.open)return;
      renderResults(data.matches);
      searchStatus.textContent=data.matches.length?`${data.matches.length} ${data.matches.length===1?'match':'matches'} found. Choose your name below.`:'We couldn’t find that name. Try your full name or contact Vidhi and Vivek.';
    }catch(error){if(error.name!=='AbortError'&&version===requestNumber)searchStatus.textContent=error.message;}
  }
  input.addEventListener('input',()=>{
    selected=null;selectButton.disabled=true;clearTimeout(timer);++requestNumber;controller?.abort();clearResults();
    timer=setTimeout(search,250);
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      if(!options.length)return;event.preventDefault();
      active=(active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
      options.forEach(({button},i)=>button.setAttribute('aria-selected',String(i===active)));
      input.setAttribute('aria-activedescendant',options[active].button.id);options[active].button.scrollIntoView({block:'nearest'});
    }else if(event.key==='Enter'&&active>=0){event.preventDefault();selectGuest(options[active].guest);}
  });
  document.getElementById('open-invitation').addEventListener('click',()=>{
    if(busy)return;
    input.value='';selected=null;selectedTeam='';teamInputs.forEach(radio=>radio.checked=false);nameStep.hidden=true;selectButton.disabled=true;clearResults();
    searchStatus.textContent='Type at least 3 letters to find your invitation.';
    nameDialog.showModal();teamInputs[0].focus();
  });
  nameDialog.addEventListener('close',()=>{controller?.abort();clearTimeout(timer);++requestNumber;});
  document.getElementById('guest-name-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!selected||!selectedTeam||busy)return;
    busy=true;selectButton.disabled=true;selectButton.textContent='Finding your invitation…';
    try{
      const data=await api('select',{method:'POST',body:{guestId:selected.id,side:selectedTeam}});
      token=data.token;profile=data;nameDialog.close();
      rsvpButton.hidden=false;
      document.getElementById('rsvp-guest-label').textContent=data.selectedGuest.split(' ')[0];
      document.dispatchEvent(new Event('invitation:guest-selected'));
    }catch(error){searchStatus.textContent=error.message;selectButton.disabled=false;}
    finally{busy=false;selectButton.textContent='Open my invitation';}
  });
  const dayNames={day1:'Day One · 26 January',day2:'Day Two · 27 January'};
  function attendanceFields(container,guest,values,prefix,attribute){
    guest.days.forEach(day=>{
      const label=text('label',dayNames[day]),id=`${prefix}-${day}`;label.htmlFor=id;
      const select=document.createElement('select');select.id=id;select.name=day;select.required=true;select.setAttribute(attribute,day);
      [['','Please choose'],['attending','Joyfully attending'],['not_attending','Unable to attend'],['undecided','Will confirm soon']].forEach(([value,title])=>{const option=text('option',title);option.value=value;select.append(option);});
      select.value=values?.[day]||'';container.append(label,select);
    });
  }
  const confirmation=document.getElementById('rsvp-confirmation');
  let celebrationTimer;
  const calendarLinks=document.getElementById('rsvp-calendar-links');
  const calendarLink=text('a','Add both days to Google Calendar');calendarLink.href=weddingGoogleCalendar(weddingCombinedCalendar());calendarLink.target='_blank';calendarLink.rel='noopener noreferrer';calendarLinks.append(calendarLink);
  const ical=document.getElementById('rsvp-ical');ical.href=URL.createObjectURL(new Blob([weddingIcs(WEDDING_CALENDAR_DAYS)],{type:'text/calendar;charset=utf-8'}));ical.download='vidhi-vivek-wedding.ics';
  document.getElementById('rsvp-email-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=document.getElementById('rsvp-email-send'),status=document.getElementById('rsvp-email-status');if(button.disabled)return;
    button.disabled=true;status.textContent='Sending your celebration details…';
    try{await api('emailCalendar',{method:'POST',body:{email:document.getElementById('rsvp-email').value.trim()}});status.textContent='Sent! Check your inbox for the schedule and calendar invitation.';}
    catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  function resetConfirmation(){
    clearTimeout(celebrationTimer);rsvpDialog.setAttribute('aria-labelledby','rsvp-title');rsvpDialog.classList.remove('rsvp-celebrating');confirmation.hidden=true;form.hidden=false;
    confirmation.querySelector('.rsvp-fireworks').replaceChildren();
  }
  function celebrate(){
    resetConfirmation();form.hidden=true;confirmation.hidden=false;rsvpDialog.classList.add('rsvp-celebrating');
    rsvpDialog.setAttribute('aria-labelledby','rsvp-confirmation-title');confirmation.focus({preventScroll:true});rsvpDialog.scrollTop=0;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const fireworks=confirmation.querySelector('.rsvp-fireworks');
    [[18,18],[80,27],[50,8],[24,58],[82,64]].forEach(([x,y],burst)=>{
      for(let i=0;i<16;i++){
        const spark=document.createElement('i'),angle=i*Math.PI/8,distance=42+(i%3)*13;
        spark.style.cssText=`left:${x}%;top:${y}%;--dx:${Math.cos(angle)*distance}px;--dy:${Math.sin(angle)*distance}px;--delay:${burst*.65}s;--spark:${['#c49b4f','#ba7891','#8d9b70'][i%3]}`;
        fireworks.append(spark);
      }
    });
    celebrationTimer=setTimeout(()=>fireworks.replaceChildren(),4000);
  }
  document.getElementById('rsvp-confirmation-done').addEventListener('click',()=>rsvpDialog.close());
  document.getElementById('rsvp-confirmation-edit').addEventListener('click',()=>{renderForm();saveButton.focus();});
  rsvpDialog.addEventListener('close',resetConfirmation);
  function renderForm(){
    resetConfirmation();
    memberList.replaceChildren();saveStatus.textContent='';saveStatus.classList.remove('saved');
    document.getElementById('rsvp-household').textContent=profile.household;
    profile.guests.forEach((guest,index)=>{
      const fieldset=document.createElement('fieldset');fieldset.className='rsvp-member';fieldset.dataset.guestId=guest.id;
      fieldset.append(text('legend',guest.name));
      attendanceFields(fieldset,guest,guest.response?.attendance,`rsvp-${index}`,'data-guest-day');
      memberList.append(fieldset);
    });
    const guest=profile.guests.find(g=>g.companion)||profile.guests[0];
    if(guest){
      const index='household',fieldset=document.createElement('fieldset');fieldset.className='rsvp-household-companion';fieldset.dataset.hostId=guest.id;fieldset.append(text('legend','A little more company'));
      const toggleLabel=document.createElement('label');toggleLabel.className='rsvp-plus-one-toggle';
      const toggle=document.createElement('input');toggle.type='checkbox';toggle.id=`rsvp-plus-one-${index}`;toggle.dataset.companionEnabled='';toggle.checked=!!guest.companion;
      toggleLabel.append(toggle,text('span','I’m bringing a +1'));fieldset.append(toggleLabel);
      const details=document.createElement('div');details.className='rsvp-plus-one-details';
      const label=text('label','Your +1’s full name');label.htmlFor=`rsvp-plus-one-name-${index}`;
      const name=document.createElement('input');name.id=label.htmlFor;name.type='text';name.maxLength=120;name.required=true;name.autocomplete='off';name.dataset.companionName='';name.placeholder='Their full name';name.value=guest.companion?.name||'';
      details.append(label,name,text('p','Please add someone who isn’t already on the guest list.','rsvp-plus-one-hint'));
      attendanceFields(details,guest,guest.companion?.attendance,`rsvp-plus-one-${index}`,'data-companion-day');
      const update=()=>{details.hidden=!toggle.checked;details.querySelectorAll('input,select').forEach(el=>el.disabled=!toggle.checked);};
      toggle.addEventListener('change',()=>{update();if(toggle.checked)name.focus();});
      update();fieldset.append(details);memberList.append(fieldset);
    }
    saveButton.textContent=profile.guests.some(g=>g.response)?'Update our RSVP':'Send our RSVP';
  }
  rsvpButton.addEventListener('click',async()=>{
    if(busy)return;busy=true;rsvpButton.disabled=true;
    try{profile=await api('profile');renderForm();rsvpDialog.showModal();}
    catch(error){renderForm();saveStatus.textContent=error.message;rsvpDialog.showModal();}
    finally{busy=false;rsvpButton.disabled=false;}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const companionSection=memberList.querySelector('.rsvp-household-companion');
    const responses=[...memberList.querySelectorAll('.rsvp-member')].map(fieldset=>({guestId:fieldset.dataset.guestId,attendance:Object.fromEntries([...fieldset.querySelectorAll('[data-guest-day]')].map(el=>[el.name,el.value]))}));
    if(companionSection){
      const host=responses.find(row=>row.guestId===companionSection.dataset.hostId);
      host.companion=companionSection.querySelector('[data-companion-enabled]').checked?{name:companionSection.querySelector('[data-companion-name]').value.trim(),attendance:Object.fromEntries([...companionSection.querySelectorAll('[data-companion-day]')].map(el=>[el.name,el.value]))}:null;
    }
    busy=true;saveButton.disabled=true;saveStatus.classList.remove('saved');saveStatus.textContent='Saving your response…';
    try{
      const data=await api('save',{method:'POST',body:{responses}});profile=data;
      saveStatus.textContent='Thank you! Your RSVP has been saved. You can update it here anytime.';saveStatus.classList.add('saved');saveButton.textContent='Update our RSVP';celebrate();
    }catch(error){saveStatus.textContent=error.message;}
    finally{busy=false;saveButton.disabled=false;}
  });
  document.querySelectorAll('[data-close-rsvp-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
})();
