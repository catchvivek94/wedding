/* Photos of Vivek & Vidhi, used across the site. */
const PHOTOS = [
  { f: "proposal-ring.jpg",   cap: "The yes — Miami" },
  { f: "family.jpg",          cap: "Family" },
  { f: "f1-miami.jpg",        cap: "Miami Grand Prix" },
  { f: "proposal-moment.jpg", cap: "The moment" },
  { f: "night-out.jpg",       cap: "Night out" },
  { f: "us-01.jpg",           cap: "" },
  { f: "us-02.jpg",           cap: "" },
  { f: "us-03.jpg",           cap: "" },
  { f: "us-04.jpg",           cap: "" },
  { f: "us-05.jpg",           cap: "" },
  { f: "us-06.jpg",           cap: "" },
  { f: "us-07.jpg",           cap: "" },
  { f: "us-08.jpg",           cap: "" },
  { f: "us-09.jpg",           cap: "" },
  { f: "us-10.jpg",           cap: "" },
  { f: "us-11.jpg",           cap: "" },
  { f: "us-12.jpg",           cap: "" }
];

/* Hero rotation — the highest-resolution, most story-relevant shots. */
const HERO_PHOTOS = ["proposal-ring.jpg", "f1-miami.jpg", "family.jpg", "night-out.jpg"];

/* Thin banner strip shown at the top of every module page.
   Rotates by page so each one feels distinct. */
function photoBanner(seed) {
  const n = PHOTOS.length;
  const start = Math.abs([...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)) % n;
  const picks = Array.from({ length: 6 }, (_, i) => PHOTOS[(start + i * 3) % n]);
  return `<div class="banner">${picks.map(p =>
    `<img src="assets/img/${p.f}" alt="" loading="lazy">`).join("")}</div>`;
}

/* Full gallery with lightbox. */
function photoGallery(mountSel) {
  const el = document.querySelector(mountSel);
  if (!el) return;
  el.innerHTML = `<div class="gallery">${PHOTOS.map((p, i) =>
    `<figure data-i="${i}"><img src="assets/img/${p.f}" alt="${p.cap || "Vivek and Vidhi"}" loading="lazy">
     ${p.cap ? `<figcaption>${p.cap}</figcaption>` : ""}</figure>`).join("")}</div>`;

  el.querySelectorAll("figure").forEach(fig => {
    fig.onclick = () => {
      let i = +fig.dataset.i;
      const bg = document.createElement("div");
      bg.className = "lightbox";
      const draw = () => {
        bg.innerHTML = `<button class="lb-nav prev" aria-label="Previous">‹</button>
          <figure><img src="assets/img/${PHOTOS[i].f}" alt="">
          ${PHOTOS[i].cap ? `<figcaption>${PHOTOS[i].cap}</figcaption>` : ""}</figure>
          <button class="lb-nav next" aria-label="Next">›</button>
          <button class="lb-close" aria-label="Close">×</button>`;
        bg.querySelector(".prev").onclick = e => { e.stopPropagation(); i = (i - 1 + PHOTOS.length) % PHOTOS.length; draw(); };
        bg.querySelector(".next").onclick = e => { e.stopPropagation(); i = (i + 1) % PHOTOS.length; draw(); };
        bg.querySelector(".lb-close").onclick = () => close();
      };
      const onKey = e => {
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") { i = (i - 1 + PHOTOS.length) % PHOTOS.length; draw(); }
        if (e.key === "ArrowRight") { i = (i + 1) % PHOTOS.length; draw(); }
      };
      const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); };
      bg.onclick = e => { if (e.target === bg) close(); };
      document.addEventListener("keydown", onKey);
      draw();
      document.body.appendChild(bg);
    };
  });
}
