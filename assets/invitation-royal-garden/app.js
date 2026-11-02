(() => {
  const pages=[...document.querySelectorAll('main .event')];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const gate=document.querySelector('.envelope-gate');
  const content=document.querySelector('.invitation-content');
  const dock=document.querySelector('.floating-dock');
  const opener=document.querySelector('#open-invitation');
  const menu=[...document.querySelectorAll('[data-event]')];
  let opening=false, observer;
  let returnFocus;
  content.inert=true;dock.inert=true;
  function revealInvitation(){
    document.body.classList.add('invitation-open');
    content.inert=false;dock.inert=false;
    window.scrollTo({top:0,behavior:'instant'});
    gate.classList.add('departing');
    document.dispatchEvent(new Event('invitation:opened'));
    setTimeout(()=>{gate.hidden=true;opening=false;document.querySelector('main').focus({preventScroll:true});},preference.matches?0:700);
  }
  opener.addEventListener('click',()=>{
    if(opening)return;
    opening=true;opener.setAttribute('aria-expanded','true');
    gate.classList.add('opening');
    setTimeout(revealInvitation,preference.matches?0:3500);
  });
  function showDialog(dialog){returnFocus=document.activeElement;dialog.showModal();}
  document.querySelectorAll('[data-dialog]').forEach(button=>button.addEventListener('click',()=>showDialog(document.getElementById(button.dataset.dialog))));
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>returnFocus?.focus({preventScroll:true}));
  });
  menu.forEach(button=>button.addEventListener('click',()=>{
    document.getElementById('events-dialog').close();
    document.getElementById(button.dataset.event).scrollIntoView({behavior:preference.matches?'instant':'smooth',block:'start'});
  }));
  document.getElementById('reopen-envelope').addEventListener('click',()=>{
    document.getElementById('events-dialog').close();
    gate.hidden=false;gate.classList.remove('opening','departing');
    opener.setAttribute('aria-expanded','false');document.body.classList.remove('invitation-open');
    content.inert=true;dock.inert=true;opener.focus();
  });
  function observe(){
    observer?.disconnect();
    document.documentElement.classList.toggle('motion-ready',!preference.matches);
    if(!('IntersectionObserver'in window)){pages.forEach(p=>p.classList.add('is-visible'));return;}
    const visible=new Map();
    observer=new IntersectionObserver(entries=>{
      for(const e of entries){visible.set(e.target,e.intersectionRatio);if(e.isIntersecting)e.target.classList.add('is-visible');}
      const active=[...visible].sort((a,b)=>b[1]-a[1])[0];
      if(active&&active[1]>0)menu.forEach(b=>{if(b.dataset.event===active[0].id)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
    },{threshold:[0,.15,.4,.7]});
    pages.forEach(p=>observer.observe(p));
  }
  const shareUrl='https://catchvivek94.github.io/wedding/assets/invitation-royal-garden/index.html';
  const shareInput=document.getElementById('share-url');shareInput.value=shareUrl;
  document.getElementById('share-invitation').addEventListener('click',async()=>{
    if(navigator.share){try{await navigator.share({title:'Vidhi & Vivek — our wedding invitation',text:'Join us to celebrate, 26–27 January 2027 in Khandala.',url:shareUrl});return;}catch(e){if(e.name==='AbortError')return;}}
    showDialog(document.getElementById('share-dialog'));
  });
  document.getElementById('copy-link').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(shareUrl);document.getElementById('share-status').textContent='Invitation link copied.';}
    catch{shareInput.focus();shareInput.select();document.getElementById('share-status').textContent='Select and copy the invitation link above.';}
  });
  preference.addEventListener('change',observe);observe();
})();
