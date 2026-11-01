(() => {
  const pages = [...document.querySelectorAll('main .event')];
  const links = [...document.querySelectorAll('nav a')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  const visible = new Map();
  function select(id) {
    for (const link of links) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function setup() {
    observer?.disconnect();
    visible.clear();
    document.documentElement.classList.remove('motion-ready');
    pages.forEach(page => page.classList.add('is-visible'));
    document.querySelectorAll('.replay').forEach(button => { button.hidden = preference.matches; });
    if (!('IntersectionObserver' in window)) return;
    if (!preference.matches) {
      pages.forEach(page => page.classList.remove('is-visible'));
      document.documentElement.classList.add('motion-ready');
    }
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        visible.set(entry.target, entry.intersectionRatio);
        if (entry.isIntersecting && entry.intersectionRatio >= .16) entry.target.classList.add('is-visible');
        else if (!entry.isIntersecting && !preference.matches) entry.target.classList.remove('is-visible');
      }
      const active = [...visible].sort((a,b) => b[1]-a[1])[0];
      if (active && active[1] > 0) select(active[0].id);
    }, {threshold: [0, .16, .35, .6, .85]});
    pages.forEach(page => observer.observe(page));
  }
  document.querySelectorAll('.replay').forEach(button => {
    button.addEventListener('click', () => {
      if (preference.matches) return;
      const page = button.closest('.event');
      page.classList.remove('is-visible');
      void page.offsetWidth;
      requestAnimationFrame(() => page.classList.add('is-visible'));
    });
  });
  preference.addEventListener('change', setup);
  setup();
})();
