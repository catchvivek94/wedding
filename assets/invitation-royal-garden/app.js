(() => {
  const pages=[...document.querySelectorAll('main .event')];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const gate=document.querySelector('.envelope-gate');
  const content=document.querySelector('.invitation-content');
  const dock=document.querySelector('.floating-dock');
  const opener=document.querySelector('#open-invitation');
  const menu=[...document.querySelectorAll('[data-event]')];
  let opening=false, observer;
  content.inert=true;dock.inert=true;
  document.documentElement.classList.toggle('motion-ready',!preference.matches);
  function enter(page){page.classList.add('is-visible');}
  function observe(){
    observer?.disconnect();
    document.documentElement.classList.toggle('motion-ready',!preference.matches);
    if(!('IntersectionObserver'in window)){pages.forEach(enter);return;}
    observer=new IntersectionObserver(entries=>{
      for(const e of entries){
        // Reveal once: scrolling back never hides content or restarts its movement.
        if(e.isIntersecting)enter(e.target);
      }
    },{threshold:0,rootMargin:'0px 0px -12% 0px'});
    pages.forEach(p=>observer.observe(p));
  }
  let scrollFrame=0;
  function updateCurrent(){
    scrollFrame=0;
    const line=innerHeight*.35;
    const active=pages.reduce((best,page)=>Math.abs(page.getBoundingClientRect().top-line)<Math.abs(best.getBoundingClientRect().top-line)?page:best,pages[0]);
    menu.forEach(b=>{if(b.dataset.event===active.id)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateCurrent);},{passive:true});
  opener.addEventListener('click',()=>{
    if(opening)return;
    opening=true;opener.setAttribute('aria-expanded','true');
    gate.classList.add('opening');
    setTimeout(()=>{
      document.body.classList.add('invitation-open');
      content.inert=false;dock.inert=false;
      window.scrollTo({top:0,behavior:'instant'});
      gate.classList.add('departing');
      setTimeout(()=>{
        gate.hidden=true;observe();updateCurrent();
        document.dispatchEvent(new Event('invitation:opened'));
        document.querySelector('main').focus({preventScroll:true});
      },preference.matches?0:500);
    },preference.matches?0:2450);
  });
  menu.forEach(button=>button.addEventListener('click',()=>{
    const page=document.getElementById(button.dataset.event);
    // Let the viewport observer introduce each page naturally during the scroll.
    page.scrollIntoView({behavior:preference.matches?'instant':'smooth',block:'start'});
  }));
  preference.addEventListener('change',()=>{if(document.body.classList.contains('invitation-open'))observe();});
})();
