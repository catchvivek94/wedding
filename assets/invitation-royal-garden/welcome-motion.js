/* Separate alpha foliage and individual petals; architecture and typography stay still. */
(async () => {
  'use strict';
  const page = document.getElementById('welcome');
  if (!page || !Element.prototype.animate) return;
  const paper = page.querySelector('.paper');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const background = new Image(), leaves = new Image();
  background.src = 'welcome-clean-blue-v8.jpg';
  leaves.src = 'welcome-template-canopy-v5.png';
  try { await Promise.all([background.decode(), leaves.decode()]); }
  catch { return; } // Keep the complete stationary illustration if an asset cannot load.
  const layer = document.createElement('div');
  layer.className = 'painting-layers welcome-decoration-layers';
  layer.setAttribute('aria-hidden', 'true');
  background.className = 'scene-background'; background.alt = '';
  layer.append(background);
  const animations = new Set();
  let visible = false;
  const active = () => visible && !document.hidden && !reduced.matches && document.body.classList.contains('invitation-open');
  const random = (low, high) => low + Math.random() * (high - low);
  const sync = () => animations.forEach(animation => active() ? animation.play() : animation.pause());
  // Move one complete alpha canopy; never slice flowers or leaves through their stems.
  const canopy = document.createElement('div');
  canopy.style.cssText = 'position:absolute;inset:0;transform-origin:50% 0%;pointer-events:none';
  leaves.alt = '';
  leaves.style.cssText = 'position:absolute;inset:0;width:100%;height:75%;object-fit:fill;opacity:.85;filter:saturate(.8)';
  canopy.append(leaves); layer.append(canopy);
  const sway = canopy.animate([
    {transform:'rotate(-1.2deg) translateX(-1px)'},
    {transform:'rotate(1.2deg) translateX(1px)'}
  ], {duration:5200,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});
  sway.pause(); animations.add(sway);
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
