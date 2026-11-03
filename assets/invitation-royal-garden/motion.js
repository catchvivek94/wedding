/* Only transparent foreground decorations move. The painted ground is immutable. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = new Map();
  const settings = {
    welcome: [{origin:'50% 0%', angle:'.8deg', period:'7s', clip:'inset(0 0 74% 0)'}],
    haldi: [
      {origin:'70.2% 2%', angle:'2.2deg', period:'5.6s', clip:'polygon(62% 0,78% 0,78% 17.6%,75.5% 19.2%,62% 19.2%)'},
      {origin:'82.8% 2%', angle:'1.8deg', period:'6.4s', clip:'polygon(80% 0,97% 0,97% 26%,72% 26%,72% 19.2%,78% 17.6%,80% 17.6%)'}
    ],
    phere: [{origin:'26% 0%', angle:'1.8deg', period:'6.5s', clip:'inset(0 50% 68% 0)', placement:'translate(8.6%, -8.5%) scale(.75)'}],
    wedding: [{origin:'0% 40.8%', angle:'1.1deg', period:'7.2s', clip:'inset(0 43% 58% 0)'}],
    sangeet: [{origin:'55.2% 6.5%', angle:'3deg', period:'5.8s', clip:'inset(5% 39% 81% 49%)'}]
  };
  function sync() {
    for (const [page, scene] of scenes) {
      const active=scene.visible && !document.hidden && !reduced.matches && document.body.classList.contains('invitation-open');
      page.classList.toggle('foreground-active', active);
    }
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{const scene=scenes.get(entry.target);if(scene)scene.visible=entry.isIntersecting;});
    sync();
  },{rootMargin:'40px'});
  async function prepare(page) {
    const definitions=settings[page.id];
    if(!definitions) return;
    const background=new Image();
    const foreground=new Image();
    background.src=`${page.id}-background-layer.png`;
    foreground.src=`${page.id}-foreground-layer.png`;
    try { await Promise.all([background.decode(),foreground.decode()]); }
    catch { return; } // Keep the complete original painting if an asset cannot load.
    const layer=document.createElement('div');
    layer.className='painting-layers';layer.setAttribute('aria-hidden','true');
    background.className='scene-background';background.alt='';layer.append(background);
    definitions.forEach((definition,index)=>{
      const placement=document.createElement('div');placement.className='foreground-placement';
      if(definition.placement) placement.style.transform=definition.placement;
      const element=foreground.cloneNode();element.alt='';element.className='foreground-element';
      element.style.transformOrigin=definition.origin;
      element.style.clipPath=definition.clip;
      element.style.setProperty('--sway',definition.angle);
      element.style.setProperty('--period',definition.period);
      element.style.animationDelay=`${index*-.8}s`;
      placement.append(element);layer.append(placement);
    });
    const paper=page.querySelector('.paper');
    paper.prepend(layer);paper.classList.add('has-layered-motion');
    scenes.set(page,{visible:false});observer.observe(page);sync();
  }
  document.querySelectorAll('.event').forEach(prepare);
  document.addEventListener('invitation:opened',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
})();
