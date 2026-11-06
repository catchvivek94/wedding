/* Separate alpha foliage and individual petals; architecture and typography stay still. */
(async () => {
  'use strict';
  const page = document.getElementById('welcome');
  if (!page || !Element.prototype.animate) return;
  const paper = page.querySelector('.paper');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const background = new Image(), topPlate = new Image(), leaves = new Image();
  background.src = 'welcome-arch-roses-v3.jpg';
  topPlate.src = 'welcome-canopy-top-v4.jpg';
  leaves.src = 'welcome-hanging-canopy-v4.png';
  try { await Promise.all([background.decode(), topPlate.decode(), leaves.decode()]); }
  catch { return; } // Keep the complete stationary illustration if an asset cannot load.
  const layer = document.createElement('div');
  layer.className = 'painting-layers welcome-decoration-layers';
  layer.setAttribute('aria-hidden', 'true');
  background.className = 'scene-background'; background.alt = '';
  layer.append(background);
  // Only replace the top. The existing lower artwork remains the exact same image.
  topPlate.alt = '';
  topPlate.className = 'scene-background';
  topPlate.style.cssText = 'mask-image:linear-gradient(to bottom,#000 0%,#000 38%,transparent 47%);-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 38%,transparent 47%)';
  layer.append(topPlate);
  const animations = new Set();
  let visible = false;
  const active = () => visible && !document.hidden && !reduced.matches && document.body.classList.contains('invitation-open');
  const random = (low, high) => low + Math.random() * (high - low);
  const sync = () => animations.forEach(animation => active() ? animation.play() : animation.pause());
  // Clip and move only transparent foliage, anchored to the curve of the arch.
  [[0,12.5,'6.25% 0%'],[12.5,25,'18.75% 0%'],[25,37.5,'31.25% 0%'],[37.5,50,'43.75% 0%'],[50,62.5,'56.25% 0%'],[62.5,75,'68.75% 0%'],[75,87.5,'81.25% 0%'],[87.5,100,'93.75% 0%']].forEach(([left, right, origin]) => {
    const branch = document.createElement('div');
    branch.style.cssText = `position:absolute;inset:0;clip-path:inset(0 ${100-right}% 0 ${left}%);transform-origin:${origin};pointer-events:none`;
    const image = leaves.cloneNode(); image.alt = '';
    image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:.85;filter:saturate(.8)';
    branch.append(image); layer.append(branch);
    const angle = random(1.6, 2.8);
    const animation = branch.animate([{transform:`rotate(${-angle}deg)`},{transform:`rotate(${angle}deg)`}], {duration:random(3400,5200),iterations:Infinity,direction:'alternate',easing:'ease-in-out'});
    animation.currentTime = random(0, 3500); animation.pause(); animations.add(animation);
  });
  // Each petal has its own randomized trajectory, size, spin, speed and next start time.
  const ns = 'http://www.w3.org/2000/svg';
  for (let i=0; i<12; i++) {
    const petal = document.createElementNS(ns,'svg');
    petal.setAttribute('viewBox','0 0 24 30');
    petal.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
    const shape = document.createElementNS(ns,'path');
    shape.setAttribute('d','M12 1C3 4 0 14 6 23C10 30 21 28 23 21C24 14 17 8 12 1Z');
    shape.setAttribute('fill',['#ce6e82','#e9949e','#db7e91','#efb0ae'][i%4]);
    shape.setAttribute('opacity','.65'); petal.append(shape); layer.append(petal);
    function fall(initial) {
      const width = paper.clientWidth, height = paper.clientHeight;
      const x=random(width*.14,width*.86), drift=random(-width*.13,width*.13);
      const size=random(width*.009,width*.017), spin=random(-160,160);
      petal.style.width=`${size}px`; petal.style.height=`${size*1.25}px`;
      const animation=petal.animate([
        {transform:`translate(${x}px,-30px) rotate(${spin}deg)`,opacity:0,offset:0},
        {transform:`translate(${x+drift*.25}px,${height*.15}px) rotate(${spin+60}deg)`,opacity:.75,offset:.17},
        {transform:`translate(${x-drift*.2}px,${height*.55}px) rotate(${spin+180}deg)`,opacity:.65,offset:.55},
        {transform:`translate(${x+drift}px,${height+30}px) rotate(${spin+300}deg)`,opacity:0,offset:1}
      ],{duration:random(15000,26000),delay:initial?0:random(400,3000),fill:'both',easing:'linear'});
      if(initial) animation.currentTime=random(0,animation.effect.getTiming().duration*.9);
      animation.pause(); animations.add(animation);
      animation.onfinish=()=>{animations.delete(animation);animation.cancel();fall(false);};
      sync();
    }
    fall(true);
  }
  paper.prepend(layer); paper.classList.add('has-layered-motion');
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.02}).observe(page);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('invitation:opened',sync);
  reduced.addEventListener('change',sync);
  sync();
})();
