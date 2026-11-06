/* Petals alone move; the original welcome illustration stays untouched. */
(() => {
  'use strict';
  const page = document.getElementById('welcome');
  const paper = page?.querySelector('.paper');
  if (!paper) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('div');
  layer.className = 'welcome-petals';
  layer.setAttribute('aria-hidden', 'true');
  // Distributed starting phases keep the fall sparse and visible from the start.
  for (let i = 0; i < 10; i++) {
    const petal = document.createElement('span');
    petal.className = 'welcome-petal';
    const duration = 21 + (i * 7 % 11);
    petal.style.cssText = `left:${12 + (i * 23 % 77)}%;--size:${5 + (i % 4)}px;--drift:${(i % 2 ? -1 : 1) * (12 + i * 3)}px;--spin:${(i % 2 ? -1 : 1) * (100 + i * 13)}deg;animation-duration:${duration}s;animation-delay:-${(i * 3.7) % duration}s`;
    layer.append(petal);
  }
  paper.append(layer);
  let visible = false;
  const sync = () => layer.classList.toggle('is-falling', visible && !document.hidden && !reduced.matches && document.body.classList.contains('invitation-open'));
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(page);
  document.addEventListener('invitation:opened', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
})();
