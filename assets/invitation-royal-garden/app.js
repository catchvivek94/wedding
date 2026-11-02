(() => {
  const pages=[...document.querySelectorAll('main .event')];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const gate=document.querySelector('.envelope-gate');
  const content=document.querySelector('.invitation-content');
  const dock=document.querySelector('.floating-dock');
  const opener=document.querySelector('#open-invitation');
  const menu=[...document.querySelectorAll('[data-event]')];
  let opening=false, observer, navigationFrame=0, pendingPage=null;
  content.inert=true;dock.inert=true;
  document.documentElement.classList.toggle('motion-ready',!preference.matches);
  function enter(page){
    if(!page || !document.body.classList.contains('invitation-open'))return;
    page.classList.add('is-visible');
  }
  function observe(){
    observer?.disconnect();
    document.documentElement.classList.toggle('motion-ready',!preference.matches);
    if(!('IntersectionObserver'in window)){pages.forEach(enter);return;}
    const visible=new Map();
    observer=new IntersectionObserver(entries=>{
      for(const e of entries){
        visible.set(e.target,e.intersectionRatio);
        if(e.isIntersecting && !pendingPage)enter(e.target);
        if(!e.isIntersecting)e.target.classList.remove('is-visible');
      }
      const active=[...visible].sort((a,b)=>b[1]-a[1])[0];
      if(active&&active[1]>0)menu.forEach(b=>{
        if(b.dataset.event===active[0].id)b.setAttribute('aria-current','location');
        else b.removeAttribute('aria-current');
      });
    },{threshold:[0,.15,.4,.7]});
    pages.forEach(p=>observer.observe(p));
  }
  opener.addEventListener('click',()=>{
    if(opening)return;
    opening=true;opener.setAttribute('aria-expanded','true');
    gate.classList.add('opening');
    setTimeout(()=>{
      document.body.classList.add('invitation-open');
      content.inert=false;dock.inert=false;
      window.scrollTo({top:0,behavior:'instant'});
      gate.classList.add('departing');
      // Begin the blank → artwork → text sequence after the envelope leaves.
      setTimeout(()=>{
        gate.hidden=true;observe();
        document.dispatchEvent(new Event('invitation:opened'));
        document.querySelector('main').focus({preventScroll:true});
      },preference.matches?0:650);
    },preference.matches?0:2800);
  });
  menu.forEach(button=>button.addEventListener('click',()=>{
    cancelAnimationFrame(navigationFrame);
    const page=document.getElementById(button.dataset.event);
    pendingPage=page;page.classList.remove('is-visible');
    page.scrollIntoView({behavior:preference.matches?'instant':'smooth',block:'start'});
    let last=window.scrollY,stable=0,start=performance.now();
    function settled(now){
      const y=window.scrollY;
      stable=Math.abs(y-last)<.5?stable+1:0;last=y;
      if((stable>5 && now-start>160)||now-start>1800){
        pendingPage=null;enter(page);
        menu.forEach(b=>{if(b===button)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
      }else navigationFrame=requestAnimationFrame(settled);
    }
    navigationFrame=requestAnimationFrame(settled);
  }));
  preference.addEventListener('change',()=>{if(document.body.classList.contains('invitation-open'))observe();});
})();
