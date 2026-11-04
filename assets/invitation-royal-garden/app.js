(() => {
  const pages=[...document.querySelectorAll('main .event')];
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const gate=document.querySelector('.envelope-gate');
  const content=document.querySelector('.invitation-content');
  const dock=document.querySelector('.floating-dock');
  const opener=document.querySelector('#open-invitation');
  const menu=[...document.querySelectorAll('[data-event]')];
  prepareReferencePages();
  let opening=false, observer, copyObserver;
  content.inert=true;dock.inert=true;
  document.documentElement.classList.toggle('motion-ready',!preference.matches);
  function enter(page){page.classList.add('is-visible','has-entered');}
  function observe(){
    observer?.disconnect();
    copyObserver?.disconnect();
    document.documentElement.classList.toggle('motion-ready',!preference.matches);
    if(!('IntersectionObserver'in window)){pages.forEach(enter);return;}
    observer=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(e.isIntersecting)enter(e.target);else e.target.classList.remove('is-visible');
      }
    },{threshold:0,rootMargin:'0px 0px -12% 0px'});
    pages.forEach(p=>observer.observe(p));
    const copy=[...document.querySelectorAll('.reveal-copy')];
    if(preference.matches){copy.forEach(el=>el.classList.add('in-view'));return;}
    copyObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('in-view');copyObserver.unobserve(entry.target);}
    },{threshold:0,rootMargin:'-3% 0px -9% 0px'});
    copy.forEach(el=>copyObserver.observe(el));
  }

  function prepareReferencePages(){
    if(matchMedia('(max-width:700px), (pointer:coarse)').matches)return;
    const ns='http://www.w3.org/2000/svg';
    const node=(tag,attrs={})=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
    const definitions={
      timeline:{width:887,height:1774,patch:[690,470,55,40],regions:[
        [265,80,370,77],[240,190,410,70],
        [120,280,330,190],[445,300,300,165],
        [408,500,285,85],[120,567,155,180],[300,630,235,50],
        [548,720,285,130],[278,755,235,70],
        [90,855,225,155],[355,880,360,95],
        [246,1025,410,77],[125,1136,225,72],[405,1120,135,115],
        [248,1270,180,75],[475,1270,355,70],
        [130,1395,115,45],[285,1380,130,95],
        [170,1500,250,115],[460,1495,345,95]
      ],route:'M570 298 C440 245 337 320 386 392 C410 425 576 446 540 516 C511 565 403 570 352 575 C240 590 267 688 320 704 C370 728 539 709 538 780 C543 869 300 822 320 904 C333 954 346 989 413 994 C504 1002 626 991 629 1060 C632 1141 495 1107 442 1114 C355 1121 342 1183 379 1216 C414 1247 466 1248 458 1298 C453 1375 275 1337 261 1418 C248 1500 406 1473 438 1522 C460 1553 443 1593 420 1608 C392 1625 335 1631 313 1646'}
    };
    Object.entries(definitions).forEach(([id,d])=>{
      const page=document.getElementById(id), link=page.querySelector('.paper>a'), source=link.querySelector('img');
      source.classList.remove('reveal-copy');source.classList.add('reference-fallback');
      const svg=node('svg',{viewBox:`0 0 ${d.width} ${d.height}`,class:'reference-scene','aria-hidden':'true'});
      const defs=node('defs');svg.append(defs);
      const pattern=node('pattern',{id:`${id}-paper`,width:d.patch[2],height:d.patch[3],patternUnits:'userSpaceOnUse'});
      const sample=node('svg',{width:d.patch[2],height:d.patch[3],viewBox:d.patch.join(' '),preserveAspectRatio:'none'});
      const picture=()=>node('image',{href:source.getAttribute('src'),width:d.width,height:d.height});
      sample.style.width=`${d.patch[2]}px`;sample.style.height=`${d.patch[3]}px`;
      sample.append(picture());pattern.append(sample);defs.append(pattern);
      svg.append(node('rect',{width:d.width,height:d.height,fill:`url(#${id}-paper)`}));
      const mask=node('mask',{id:`${id}-background`,maskUnits:'userSpaceOnUse',x:0,y:0,width:d.width,height:d.height});
      mask.append(node('rect',{width:d.width,height:d.height,fill:'white'}));defs.append(mask);
      d.regions.forEach(([x,y,width,height])=>{
        mask.append(node('rect',{x,y,width,height,fill:'black'}));
      });
      if(d.route)mask.append(node('path',{d:d.route,fill:'none',stroke:'black','stroke-width':16}));
      const background=picture();background.setAttribute('mask',`url(#${id}-background)`);svg.append(background);
      if(d.route){
        // Reveal the original painted dashes along their curved route, in scroll order.
        const routeMask=node('mask',{id:'timeline-route',maskUnits:'userSpaceOnUse',x:0,y:0,width:d.width,height:d.height});
        const trail=node('path',{d:d.route,fill:'none',stroke:'white','stroke-width':16,'stroke-linecap':'round',pathLength:1,class:'timeline-trace'});
        routeMask.append(trail);defs.append(routeMask);
        const route=picture();route.setAttribute('mask','url(#timeline-route)');svg.append(route);
        const update=()=>{
          const r=svg.getBoundingClientRect();
          const progress=Math.max(0,Math.min(1,(innerHeight*.82-r.top)/r.height));
          trail.style.strokeDashoffset=1-progress;
        };
        addEventListener('scroll',()=>{if(!page._routeFrame)page._routeFrame=requestAnimationFrame(()=>{page._routeFrame=0;update();});},{passive:true});
        addEventListener('resize',update);document.addEventListener('invitation:opened',update);update();
      }
      d.regions.forEach(([x,y,width,height],i)=>{
        // A small local SVG gives each element its own viewport intersection box.
        const piece=document.createElement('div');piece.className='reference-piece reveal-copy';
        Object.assign(piece.style,{position:'absolute',left:`${x/d.width*100}%`,top:`${y/d.height*100}%`,width:`${width/d.width*100}%`,height:`${height/d.height*100}%`});
        const crop=node('svg',{viewBox:`${x} ${y} ${width} ${height}`,width,height});
        crop.append(picture());piece.append(crop);
        piece.style.setProperty('--piece-delay',`${id==='wardrobe' ? (i<2?i*160:(i-2)%6*100) : (i<2?i*140:(i-2)%2*140)}ms`);
        link.append(piece);
      });
      link.append(svg);page.classList.add('has-reference-scene');
    });
  }

  let scrollFrame=0;
  function indicate(id){
    const sectionId=({phere:'haldi',sangeet:'wedding'})[id]||id;
    const index=menu.findIndex(b=>b.dataset.event===sectionId);
    dock.style.setProperty('--active-event',Math.max(0,index));
    dock.classList.toggle('has-current',index>=0);
    menu.forEach(b=>{if(b.dataset.event===sectionId)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});
  }
  function updateCurrent(){
    scrollFrame=0;
    const line=innerHeight*.35;
    const active=pages.find(page=>{const r=page.getBoundingClientRect();return r.top<=line&&r.bottom>line;})||pages[0];
    indicate(active.id);
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateCurrent);},{passive:true});
  document.addEventListener('invitation:guest-selected',()=>{
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
    indicate(page.id);
    if(!preference.matches){
      button.classList.remove('tap-feedback');
      requestAnimationFrame(()=>button.classList.add('tap-feedback'));
    }
    // Let the viewport observer introduce each page naturally during the scroll.
    page.scrollIntoView({behavior:preference.matches||matchMedia('(max-width:700px), (pointer:coarse)').matches?'instant':'smooth',block:'start'});
  }));
  menu.forEach(button=>button.addEventListener('animationend',()=>button.classList.remove('tap-feedback')));
  addEventListener('resize',updateCurrent);
  preference.addEventListener('change',()=>{if(document.body.classList.contains('invitation-open'))observe();});
})();
